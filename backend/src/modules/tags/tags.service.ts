import { query } from '../../database';

export async function findAll(tenantId: string) {
  const { rows } = await query(
    'SELECT * FROM tags WHERE tenant_id = $1 ORDER BY name ASC',
    [tenantId]
  );
  return rows;
}

export async function create(tenantId: string, data: any) {
  const { rows } = await query(
    'INSERT INTO tags (tenant_id, name, color) VALUES ($1, $2, $3) RETURNING *',
    [tenantId, data.name, data.color || '#6366f1']
  );
  return rows[0];
}

export async function update(id: string, tenantId: string, data: any) {
  const { rows } = await query(
    'UPDATE tags SET name = COALESCE($1, name), color = COALESCE($2, color) WHERE id = $3 AND tenant_id = $4 RETURNING *',
    [data.name, data.color, id, tenantId]
  );
  return rows[0];
}

export async function remove(id: string, tenantId: string) {
  await query('DELETE FROM tags WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
}
