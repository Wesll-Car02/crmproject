import { query } from '../../database';

export async function getLeadsReport(tenantId: string, filters: any = {}) {
  const { dateFrom, dateTo } = filters;
  const conditions = ['tenant_id = $1'];
  const params: any[] = [tenantId];
  let idx = 2;

  if (dateFrom) { conditions.push(`created_at >= $${idx++}`); params.push(dateFrom); }
  if (dateTo) { conditions.push(`created_at <= $${idx++}`); params.push(dateTo); }

  const { rows: byStatus } = await query(`
    SELECT status, COUNT(*) AS count
    FROM leads WHERE ${conditions.join(' AND ')}
    GROUP BY status ORDER BY count DESC
  `, params);

  const { rows: bySource } = await query(`
    SELECT COALESCE(source, 'direct') AS source, COUNT(*) AS count
    FROM leads WHERE ${conditions.join(' AND ')}
    GROUP BY source ORDER BY count DESC
  `, params);

  const { rows: byDay } = await query(`
    SELECT DATE(created_at) AS date, COUNT(*) AS count
    FROM leads WHERE ${conditions.join(' AND ')}
    GROUP BY DATE(created_at) ORDER BY date ASC
  `, params);

  const { rows: [totals] } = await query(`
    SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'converted') AS converted,
           AVG(score) AS avg_score
    FROM leads WHERE ${conditions.join(' AND ')}
  `, params);

  return { byStatus, bySource, byDay, totals };
}

export async function getOpportunitiesReport(tenantId: string, filters: any = {}) {
  const { dateFrom, dateTo, pipelineId } = filters;
  const conditions = ['o.tenant_id = $1'];
  const params: any[] = [tenantId];
  let idx = 2;

  if (pipelineId) { conditions.push(`ps.pipeline_id = $${idx++}`); params.push(pipelineId); }
  if (dateFrom) { conditions.push(`o.created_at >= $${idx++}`); params.push(dateFrom); }
  if (dateTo) { conditions.push(`o.created_at <= $${idx++}`); params.push(dateTo); }

  const { rows: byStage } = await query(`
    SELECT ps.name AS stage, COUNT(o.id) AS count, COALESCE(SUM(o.value), 0) AS total_value
    FROM opportunities o
    JOIN pipeline_stages ps ON ps.id = o.stage_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY ps.name, ps.sort_order ORDER BY ps.sort_order
  `, params);

  const { rows: byMonth } = await query(`
    SELECT TO_CHAR(o.created_at, 'YYYY-MM') AS month,
           COUNT(o.id) AS count,
           COALESCE(SUM(o.value), 0) AS total_value,
           COUNT(o.id) FILTER (WHERE o.status = 'won') AS won
    FROM opportunities o
    JOIN pipeline_stages ps ON ps.id = o.stage_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY TO_CHAR(o.created_at, 'YYYY-MM') ORDER BY month
  `, params);

  const { rows: [totals] } = await query(`
    SELECT COUNT(o.id) AS total,
           COUNT(o.id) FILTER (WHERE o.status = 'won') AS won,
           COUNT(o.id) FILTER (WHERE o.status = 'lost') AS lost,
           COALESCE(SUM(o.value) FILTER (WHERE o.status = 'won'), 0) AS won_value
    FROM opportunities o
    JOIN pipeline_stages ps ON ps.id = o.stage_id
    WHERE ${conditions.join(' AND ')}
  `, params);

  return { byStage, byMonth, totals };
}

export async function getChatReport(tenantId: string, filters: any = {}) {
  const { dateFrom, dateTo } = filters;
  const conditions = ['c.tenant_id = $1'];
  const params: any[] = [tenantId];
  let idx = 2;

  if (dateFrom) { conditions.push(`c.created_at >= $${idx++}`); params.push(dateFrom); }
  if (dateTo) { conditions.push(`c.created_at <= $${idx++}`); params.push(dateTo); }

  const { rows: byChannel } = await query(`
    SELECT c.channel, COUNT(c.id) AS conversations, COALESCE(SUM(m.cnt), 0) AS messages
    FROM conversations c
    LEFT JOIN (SELECT conversation_id, COUNT(*) AS cnt FROM messages GROUP BY conversation_id) m ON m.conversation_id = c.id
    WHERE ${conditions.join(' AND ')}
    GROUP BY c.channel
  `, params);

  const { rows: [totals] } = await query(`
    SELECT COUNT(c.id) AS total_conversations,
           COUNT(c.id) FILTER (WHERE c.status = 'open') AS open,
           COUNT(c.id) FILTER (WHERE c.status = 'resolved') AS resolved
    FROM conversations c
    WHERE ${conditions.join(' AND ')}
  `, params);

  return { byChannel, totals };
}

export async function getSalesTeamReport(tenantId: string) {
  const { rows } = await query(`
    SELECT u.first_name || ' ' || u.last_name AS name,
           COUNT(l.id) AS leads,
           COUNT(o.id) AS opportunities,
           COUNT(o.id) FILTER (WHERE o.status = 'won') AS won,
           COALESCE(SUM(o.value) FILTER (WHERE o.status = 'won'), 0) AS revenue
    FROM users u
    LEFT JOIN leads l ON l.owner_id = u.id AND l.tenant_id = $1
    LEFT JOIN opportunities o ON o.owner_id = u.id AND o.tenant_id = $1
    WHERE u.tenant_id = $1 AND u.is_active = true
    GROUP BY u.id, u.first_name, u.last_name
    ORDER BY revenue DESC
  `, [tenantId]);
  return rows;
}
