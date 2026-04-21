import { query } from '../../database';

export async function findAll(tenantId: string, filters: any = {}) {
  const conditions = ['p.tenant_id = $1'];
  const params: any[] = [tenantId];

  if (filters.status) { conditions.push(`p.status = $2`); params.push(filters.status); }

  const { rows } = await query(`
    SELECT p.*, o.title AS opportunity_title, u.first_name || ' ' || u.last_name AS created_by_name
    FROM proposals p
    LEFT JOIN opportunities o ON o.id = p.opportunity_id
    LEFT JOIN users u ON u.id = p.created_by
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.created_at DESC
  `, params);
  return rows;
}

export async function findById(id: string, tenantId: string) {
  const { rows } = await query('SELECT * FROM proposals WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  return rows[0] || null;
}

export async function create(tenantId: string, userId: string, data: any) {
  const { rows: countRows } = await query(
    "SELECT COUNT(*) + 1 AS next FROM proposals WHERE tenant_id = $1",
    [tenantId]
  );
  const number = `PROP-${String(countRows[0].next).padStart(4, '0')}`;

  const { rows } = await query(`
    INSERT INTO proposals (tenant_id, opportunity_id, title, number, content, status, total_value, valid_until, created_by)
    VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8) RETURNING *
  `, [tenantId, data.opportunityId || null, data.title, number, JSON.stringify(data.content || {}), data.totalValue || 0, data.validUntil || null, userId]);
  return rows[0];
}

export async function update(id: string, tenantId: string, data: any) {
  const { rows } = await query(`
    UPDATE proposals
    SET title = COALESCE($1, title),
        content = COALESCE($2, content),
        status = COALESCE($3, status),
        total_value = COALESCE($4, total_value),
        valid_until = COALESCE($5, valid_until),
        updated_at = NOW()
    WHERE id = $6 AND tenant_id = $7 RETURNING *
  `, [data.title, data.content ? JSON.stringify(data.content) : null, data.status, data.totalValue, data.validUntil, id, tenantId]);
  return rows[0];
}

export async function remove(id: string, tenantId: string) {
  await query('DELETE FROM proposals WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
}

export async function sendProposal(id: string, tenantId: string) {
  const { rows } = await query(`
    UPDATE proposals SET status = 'sent', sent_at = NOW(), updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2 RETURNING *
  `, [id, tenantId]);
  return rows[0];
}
