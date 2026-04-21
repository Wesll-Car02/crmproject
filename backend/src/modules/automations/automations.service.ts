import { query } from '../../database';

export async function findAll(tenantId: string) {
  const { rows } = await query(`
    SELECT a.*, u.first_name || ' ' || u.last_name AS created_by_name
    FROM automations a
    LEFT JOIN users u ON u.id = a.created_by
    WHERE a.tenant_id = $1 ORDER BY a.created_at DESC
  `, [tenantId]);
  return rows;
}

export async function findById(id: string, tenantId: string) {
  const { rows } = await query('SELECT * FROM automations WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
  return rows[0] || null;
}

export async function create(tenantId: string, userId: string, data: any) {
  const { rows } = await query(`
    INSERT INTO automations (tenant_id, name, description, trigger_type, nodes, edges, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
  `, [tenantId, data.name, data.description || null, data.triggerType || 'manual',
      JSON.stringify(data.nodes || []), JSON.stringify(data.edges || []), userId]);
  return rows[0];
}

export async function update(id: string, tenantId: string, data: any) {
  const { rows } = await query(`
    UPDATE automations
    SET name = COALESCE($1, name),
        description = COALESCE($2, description),
        is_active = COALESCE($3, is_active),
        nodes = COALESCE($4, nodes),
        edges = COALESCE($5, edges),
        updated_at = NOW()
    WHERE id = $6 AND tenant_id = $7 RETURNING *
  `, [data.name, data.description, data.isActive,
      data.nodes ? JSON.stringify(data.nodes) : null,
      data.edges ? JSON.stringify(data.edges) : null,
      id, tenantId]);
  return rows[0];
}

export async function remove(id: string, tenantId: string) {
  await query('DELETE FROM automations WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
}

export async function toggleActive(id: string, tenantId: string) {
  const { rows } = await query(`
    UPDATE automations SET is_active = NOT is_active, updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2 RETURNING *
  `, [id, tenantId]);
  return rows[0];
}

export async function getExecutions(automationId: string, tenantId: string) {
  try {
    const { rows } = await query(`
      SELECT ae.*, (
        SELECT json_agg(ael ORDER BY ael.executed_at) FROM automation_execution_logs ael WHERE ael.execution_id = ae.id
      ) AS logs
      FROM automation_executions ae
      WHERE ae.automation_id = $1 AND ae.tenant_id = $2
      ORDER BY ae.started_at DESC LIMIT 20
    `, [automationId, tenantId]);
    return rows;
  } catch {
    return [];
  }
}

export async function triggerManual(id: string, tenantId: string, userId: string, payload: any) {
  const automation = await findById(id, tenantId);
  if (!automation) throw new Error('Automação não encontrada');

  const { rows } = await query(`
    INSERT INTO automation_executions (tenant_id, automation_id, trigger_data, status)
    VALUES ($1, $2, $3, 'running') RETURNING *
  `, [tenantId, id, JSON.stringify({ triggeredBy: userId, ...payload })]);

  await query('UPDATE automations SET run_count = run_count + 1, last_run_at = NOW() WHERE id = $1', [id]);

  // Simple node execution (placeholder - real engine runs in worker)
  setTimeout(async () => {
    try {
      await query(
        'UPDATE automation_executions SET status = $1, completed_at = NOW() WHERE id = $2',
        ['completed', rows[0].id]
      );
    } catch { /* ignore */ }
  }, 100);

  return rows[0];
}
