import { query } from '../../database';

export async function findAll(tenantId: string, filters: any = {}) {
  const { status, type } = filters;
  const conditions = ['c.tenant_id = $1'];
  const params: any[] = [tenantId];
  let idx = 2;

  if (status) { conditions.push(`c.status = $${idx}`); params.push(status); idx++; }
  if (type) { conditions.push(`c.type = $${idx}`); params.push(type); idx++; }

  const { rows } = await query(`
    SELECT c.*, u.first_name || ' ' || u.last_name AS created_by_name
    FROM campaigns c
    LEFT JOIN users u ON u.id = c.created_by
    WHERE ${conditions.join(' AND ')}
    ORDER BY c.created_at DESC
  `, params);
  return rows;
}

export async function findById(id: string, tenantId: string) {
  const { rows } = await query('SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  return rows[0] || null;
}

export async function create(tenantId: string, userId: string, data: any) {
  const { rows } = await query(`
    INSERT INTO campaigns (tenant_id, name, type, subject, content, content_html, scheduled_at, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
  `, [tenantId, data.name, data.type || 'email', data.subject || null, data.content, data.contentHtml || null, data.scheduledAt || null, userId]);
  return rows[0];
}

export async function update(id: string, tenantId: string, data: any) {
  const { rows } = await query(`
    UPDATE campaigns
    SET name = COALESCE($1, name),
        subject = COALESCE($2, subject),
        content = COALESCE($3, content),
        scheduled_at = COALESCE($4, scheduled_at),
        status = COALESCE($5, status),
        updated_at = NOW()
    WHERE id = $6 AND tenant_id = $7 RETURNING *
  `, [data.name, data.subject, data.content, data.scheduledAt, data.status, id, tenantId]);
  return rows[0];
}

export async function remove(id: string, tenantId: string) {
  await query('DELETE FROM campaigns WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
}

export async function getStats(tenantId: string) {
  try {
    const { rows } = await query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'sent') AS sent,
        COUNT(*) FILTER (WHERE status = 'draft') AS draft,
        COUNT(*) FILTER (WHERE status = 'scheduled') AS scheduled,
        COALESCE(SUM(sent_count), 0) AS total_sent,
        COALESCE(SUM(opened_count), 0) AS total_opened
      FROM campaigns WHERE tenant_id = $1
    `, [tenantId]);
    return rows[0];
  } catch {
    return {};
  }
}
