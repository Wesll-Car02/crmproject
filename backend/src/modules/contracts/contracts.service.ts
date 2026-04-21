import { query } from '../../database';
import crypto from 'crypto';

export async function findAll(tenantId: string, filters: any) {
  const { search, status, page = 1, limit = 50 } = filters;
  
  const conditions = ['c.tenant_id = $1'];
  const params: any[] = [tenantId];
  let idx = 2;

  if (search) {
    conditions.push(`c.title ILIKE $${idx} OR c.number ILIKE $${idx}`);
    params.push(`%${search}%`);
    idx++;
  }
  if (status) {
    conditions.push(`c.status = $${idx}`);
    params.push(status);
    idx++;
  }

  const offset = (Number(page) - 1) * Number(limit);

  const sql = `
    SELECT c.*,
           cont.name as contact_name, cont.email as contact_email,
           opp.title as opportunity_title
    FROM contracts c
    LEFT JOIN contacts cont ON cont.id = c.contact_id
    LEFT JOIN opportunities opp ON opp.id = c.opportunity_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  params.push(limit, offset);

  const countSql = `SELECT COUNT(*) FROM contracts c WHERE ${conditions.join(' AND ')}`;

  const [{ rows }, { rows: countRows }] = await Promise.all([
    query(sql, params),
    query(countSql, params.slice(0, idx - 1)),
  ]);

  return {
    data: rows,
    total: parseInt(countRows[0].count),
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(parseInt(countRows[0].count) / Number(limit)),
  };
}

export async function findById(id: string, tenantId: string) {
  const { rows } = await query(
    `SELECT c.*,
            cont.name as contact_name, cont.email as contact_email,
            opp.title as opportunity_title
     FROM contracts c
     LEFT JOIN contacts cont ON cont.id = c.contact_id
     LEFT JOIN opportunities opp ON opp.id = c.opportunity_id
     WHERE c.id = $1 AND c.tenant_id = $2`,
    [id, tenantId]
  );
  return rows[0] || null;
}

export async function create(tenantId: string, userId: string, data: any) {
  const number = `CTR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const signToken = crypto.randomBytes(32).toString('hex');
  
  const { rows } = await query(
    `INSERT INTO contracts (
      tenant_id, proposal_id, contact_id, opportunity_id, number, title,
      content, status, value, start_date, end_date, renewal_date, 
      sign_token, notes, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    RETURNING *`,
    [
      tenantId, data.proposalId, data.contactId, data.opportunityId, 
      number, data.title, JSON.stringify(data.content || {}),
      data.status || 'draft', data.value || 0, data.startDate, 
      data.endDate, data.renewalDate, signToken, data.notes, userId
    ]
  );
  
  return rows[0];
}

export async function update(id: string, tenantId: string, data: any) {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const updatable = ['title', 'content', 'status', 'value', 'start_date', 'end_date', 'renewal_date', 'notes'];

  for (const key of updatable) {
    const camelKey = key.replace(/_([a-z])/g, (_, k) => k.toUpperCase());
    if (data[camelKey] !== undefined || data[key] !== undefined) {
      const val = data[camelKey] !== undefined ? data[camelKey] : data[key];
      fields.push(`${key} = $${idx}`);
      values.push(key === 'content' ? JSON.stringify(val) : val);
      idx++;
    }
  }

  if (fields.length === 0) throw new Error('Nenhum campo para atualizar');

  // Increment version on content change (simple approach)
  if (data.content) {
    fields.push(`version = version + 1`);
  }

  values.push(id, tenantId);
  const { rows } = await query(
    `UPDATE contracts SET ${fields.join(', ')}
     WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`,
    values
  );
  return rows[0];
}

export async function remove(id: string, tenantId: string) {
  await query('DELETE FROM contracts WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
}

export async function sign(token: string, ip: string, signerName: string) {
  const { rows } = await query('SELECT id, status FROM contracts WHERE sign_token = $1', [token]);
  const contract = rows[0];
  
  if (!contract) throw new Error('Link de assinatura inválido ou expirado');
  if (contract.status !== 'draft') throw new Error('Este contrato já não está mais na fase de rascunho/assinatura');
  
  const { rows: updated } = await query(
    `UPDATE contracts 
     SET status = 'active', signed_at = NOW(), signer_ip = $1, signer_name = $2
     WHERE sign_token = $3 RETURNING *`,
    [ip, signerName, token]
  );
  return updated[0];
}

export async function generatePdf(id: string, tenantId: string) {
  // Mock PDF generation for now, just sets a dummy URL
  const pdfUrl = `https://dummy-bucket.s3.amazonaws.com/contracts/${id}.pdf`;
  
  await query(
    `UPDATE contracts SET pdf_url = $1 WHERE id = $2 AND tenant_id = $3`,
    [pdfUrl, id, tenantId]
  );
  
  return { pdfUrl };
}
