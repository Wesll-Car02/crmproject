import { query } from '../../database';
import crypto from 'crypto';

// --- BILLINGS / BOLETOS ---

export async function findBillings(tenantId: string, filters: any) {
  const { status, type, page = 1, limit = 50 } = filters;
  const conditions = ['b.tenant_id = $1'];
  const params: any[] = [tenantId];
  let idx = 2;

  if (status) { conditions.push(`b.status = $${idx}`); params.push(status); idx++; }
  if (type) { conditions.push(`b.type = $${idx}`); params.push(type); idx++; }

  const offset = (Number(page) - 1) * Number(limit);
  const sql = `
    SELECT b.*, c.name as contact_name
    FROM billings b
    LEFT JOIN contacts c ON c.id = b.contact_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY b.due_date DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  params.push(limit, offset);

  const { rows } = await query(sql, params);
  const { rows: countRows } = await query(`SELECT COUNT(*) FROM billings b WHERE ${conditions.join(' AND ')}`, params.slice(0, idx - 1));

  return {
    data: rows,
    total: parseInt(countRows[0].count),
    page: Number(page),
    limit: Number(limit),
  };
}

export async function createBilling(tenantId: string, userId: string, data: any) {
  const number = `FAT-${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;
  
  const { rows } = await query(
    `INSERT INTO billings (
      tenant_id, contact_id, opportunity_id, contract_id, number, description, type,
      subtotal, total, due_date, status, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
    [
      tenantId, data.contactId, data.opportunityId, data.contractId, number,
      data.description, data.type || 'single', data.subtotal || data.total,
      data.total, data.dueDate, 'pending', userId
    ]
  );
  return rows[0];
}

export async function generateOnerousBoleto(id: string, tenantId: string) {
  // Mock Integrando com API Sandbox Bradesco
  const boletoDigitavel = `2379${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(10000 + Math.random() * 90000)}.000000 ${Math.floor(10000 + Math.random() * 90000)}.000000 1 ${Math.floor(1000000000 + Math.random() * 9000000000)}`;
  const boletoUrl = `https://boleto.sandbox.bradesco.com.br/view/${crypto.randomBytes(8).toString('hex')}`;
  
  const { rows } = await query(
    `UPDATE billings SET 
      payment_method = 'boleto',
      boleto_id = $1,
      boleto_digitable = $2,
      boleto_url = $3
     WHERE id = $4 AND tenant_id = $5 RETURNING *`,
    [`BRADESCO-${Date.now()}`, boletoDigitavel, boletoUrl, id, tenantId]
  );
  return rows[0];
}

export async function registerPayment(id: string, tenantId: string, data: any) {
  const { rows: billingRows } = await query('SELECT * FROM billings WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  if (!billingRows[0]) throw new Error('Cobrança não encontrada');

  await query(
    `INSERT INTO payments (tenant_id, billing_id, amount, payment_method, paid_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [tenantId, id, data.amount || billingRows[0].total, data.paymentMethod || 'boleto', data.paidAt || new Date(), data.userId]
  );

  const { rows } = await query(
    `UPDATE billings SET status = 'paid', paid_at = NOW() WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0];
}

// --- SUBSCRIPTIONS / MRR ---

export async function findSubscriptions(tenantId: string) {
  const { rows } = await query(`
    SELECT s.*, c.name as contact_name, p.name as product_name
    FROM subscriptions s
    LEFT JOIN contacts c ON c.id = s.contact_id
    LEFT JOIN products p ON p.id = s.product_id
    WHERE s.tenant_id = $1
    ORDER BY s.created_at DESC
  `, [tenantId]);
  return rows;
}

export async function getMrrMetrics(tenantId: string) {
  const { rows } = await query(`
    SELECT 
      SUM(CASE WHEN billing_cycle = 'monthly' THEN value 
               WHEN billing_cycle = 'annual' THEN value / 12 END) as mrr
    FROM subscriptions 
    WHERE tenant_id = $1 AND status = 'active'
  `, [tenantId]);
  
  return { mrr: parseFloat(rows[0].mrr || '0') };
}

// --- COMMISSIONS ---

export async function findCommissions(tenantId: string) {
  const { rows } = await query(`
    SELECT c.*, u.first_name || ' ' || u.last_name as user_name
    FROM commissions c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.tenant_id = $1
    ORDER BY c.created_at DESC
  `, [tenantId]);
  return rows;
}

export async function generateBasicNfe(billingId: string, tenantId: string, data: any) {
  const number = `NFSE-${Math.floor(100000 + Math.random() * 900000)}`;
  // Mock NFe emission
  const { rows } = await query(
    `INSERT INTO nfe_documents (
      tenant_id, billing_id, type, number, status, xml_url, pdf_url
    ) VALUES ($1, $2, 'nfse', $3, 'issued', $4, $5) RETURNING *`,
    [tenantId, billingId, number, `https://dummy/xml/${number}.xml`, `https://dummy/pdf/${number}.pdf`]
  );
  return rows[0];
}

// --- FORECASTING ---

export async function getSalesForecasting(tenantId: string) {
  // Retorna previsão dos próximos meses baseada em oportunidades abertas
  const { rows } = await query(
    `SELECT to_char(expected_close, 'YYYY-MM') as month,
            SUM(value * (probability / 100.0)) as expected_revenue
     FROM opportunities
     WHERE tenant_id = $1 AND status = 'open' AND expected_close IS NOT NULL
     GROUP BY to_char(expected_close, 'YYYY-MM')
     ORDER BY month`,
    [tenantId]
  );
  return rows;
}
