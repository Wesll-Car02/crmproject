import { query } from '../../database';

export async function getStats(tenantId: string) {
  const [leadsRes, oppsRes, tasksRes, convRes] = await Promise.allSettled([
    query(`
      SELECT
        COUNT(*) AS total_leads,
        COUNT(*) FILTER (WHERE status = 'new') AS new_leads,
        COUNT(*) FILTER (WHERE score >= 80) AS hot_leads,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS leads_this_month,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS leads_this_week
      FROM leads WHERE tenant_id = $1
    `, [tenantId]),

    query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') AS open_opps,
        COUNT(*) FILTER (WHERE status = 'won') AS won_opps,
        COUNT(*) FILTER (WHERE status = 'lost') AS lost_opps,
        COALESCE(SUM(value) FILTER (WHERE status = 'open'), 0) AS pipeline_value,
        COALESCE(SUM(value) FILTER (WHERE status = 'won' AND won_at >= date_trunc('month', NOW())), 0) AS won_this_month
      FROM opportunities WHERE tenant_id = $1
    `, [tenantId]),

    query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_tasks,
        COUNT(*) FILTER (WHERE status = 'done') AS done_tasks,
        COUNT(*) FILTER (WHERE status = 'pending' AND due_date < NOW()) AS overdue_tasks
      FROM lead_tasks WHERE tenant_id = $1
    `, [tenantId]),

    query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'open') AS open_conversations,
        COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_conversations
      FROM conversations WHERE tenant_id = $1
    `, [tenantId]),
  ]);

  const leads = leadsRes.status === 'fulfilled' ? leadsRes.value.rows[0] : {};
  const opps = oppsRes.status === 'fulfilled' ? oppsRes.value.rows[0] : {};
  const tasks = tasksRes.status === 'fulfilled' ? tasksRes.value.rows[0] : {};
  const convs = convRes.status === 'fulfilled' ? convRes.value.rows[0] : {};

  return { leads, opportunities: opps, tasks, conversations: convs };
}

export async function getLeadsChart(tenantId: string) {
  try {
    const { rows } = await query(`
      SELECT date_trunc('day', created_at)::date AS date, COUNT(*) AS count
      FROM leads
      WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY 1 ORDER BY 1
    `, [tenantId]);
    return rows;
  } catch {
    return [];
  }
}

export async function getOppsChart(tenantId: string) {
  try {
    const { rows } = await query(`
      SELECT ps.name AS stage, COUNT(o.id) AS count, COALESCE(SUM(o.value), 0) AS value
      FROM pipeline_stages ps
      LEFT JOIN opportunities o ON o.stage_id = ps.id AND o.status = 'open' AND o.tenant_id = $1
      WHERE ps.tenant_id = $1
      GROUP BY ps.id, ps.name, ps.sort_order
      ORDER BY ps.sort_order
    `, [tenantId]);
    return rows;
  } catch {
    return [];
  }
}

export async function getRecentActivity(tenantId: string) {
  try {
    const { rows } = await query(`
      SELECT 'lead' AS type, l.name AS title, l.created_at AS date, u.first_name AS user
      FROM leads l
      LEFT JOIN users u ON u.id = l.owner_id
      WHERE l.tenant_id = $1
      UNION ALL
      SELECT 'opportunity' AS type, o.title, o.created_at, u.first_name
      FROM opportunities o
      LEFT JOIN users u ON u.id = o.owner_id
      WHERE o.tenant_id = $1
      ORDER BY date DESC LIMIT 10
    `, [tenantId]);
    return rows;
  } catch {
    return [];
  }
}
