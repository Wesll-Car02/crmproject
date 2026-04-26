import { query } from '../../database';

export async function findAll(tenantId: string, filters: any) {
  const {
    search, status, source, ownerId, teamId, score_min, score_max,
    temperature, page = 1, limit = 50, sort = 'created_at', order = 'DESC'
  } = filters;

  const conditions = ['l.tenant_id = $1'];
  const params: any[] = [tenantId];
  let idx = 2;

  if (search) {
    conditions.push(`to_tsvector('portuguese', coalesce(l.name,'') || ' ' || coalesce(l.email,'') || ' ' || coalesce(l.company,'')) @@ plainto_tsquery('portuguese', $${idx})`);
    params.push(search); idx++;
  }
  if (status) { conditions.push(`l.status = $${idx}`); params.push(status); idx++; }
  if (source) { conditions.push(`l.source = $${idx}`); params.push(source); idx++; }
  if (ownerId) { conditions.push(`l.owner_id = $${idx}`); params.push(ownerId); idx++; }
  if (teamId) { conditions.push(`l.team_id = $${idx}`); params.push(teamId); idx++; }
  if (temperature) { conditions.push(`l.temperature = $${idx}`); params.push(temperature); idx++; }
  if (score_min !== undefined) { conditions.push(`l.score >= $${idx}`); params.push(score_min); idx++; }
  if (score_max !== undefined) { conditions.push(`l.score <= $${idx}`); params.push(score_max); idx++; }

  const allowedSorts = ['name', 'created_at', 'score', 'last_activity_at', 'status'];
  const safeSort = allowedSorts.includes(sort) ? sort : 'created_at';
  const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

  const offset = (Number(page) - 1) * Number(limit);

  const sql = `
    SELECT l.*,
           u.first_name || ' ' || u.last_name as owner_name,
           u.avatar_url as owner_avatar,
           COALESCE(json_agg(t.*) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
    FROM leads l
    LEFT JOIN users u ON u.id = l.owner_id
    LEFT JOIN lead_tags lt ON lt.lead_id = l.id
    LEFT JOIN tags t ON t.id = lt.tag_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY l.id, u.first_name, u.last_name, u.avatar_url
    ORDER BY l.${safeSort} ${safeOrder}
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  params.push(limit, offset);

  const countSql = `
    SELECT COUNT(DISTINCT l.id) FROM leads l
    WHERE ${conditions.join(' AND ')}
  `;

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
    `SELECT l.*,
            u.first_name || ' ' || u.last_name as owner_name,
            u.avatar_url as owner_avatar,
            COALESCE(json_agg(DISTINCT t.*) FILTER (WHERE t.id IS NOT NULL), '[]') as tags,
            -- Get converted opportunity if exists
            COALESCE(
              json_agg(DISTINCT jsonb_build_object(
                'id', o.id,
                'title', o.title,
                'value', o.value,
                'stage_name', ps.name,
                'stage_color', ps.color,
                'created_at', o.created_at
              )) FILTER (WHERE o.id IS NOT NULL AND o.lead_id IS NOT NULL), '[]'::json
            ) as converted_opportunities
     FROM leads l
     LEFT JOIN users u ON u.id = l.owner_id
     LEFT JOIN lead_tags lt ON lt.lead_id = l.id
     LEFT JOIN tags t ON t.id = lt.tag_id
     LEFT JOIN opportunities o ON o.lead_id = l.id AND o.tenant_id = l.tenant_id
     LEFT JOIN pipeline_stages ps ON ps.id = o.stage_id
     WHERE l.id = $1 AND l.tenant_id = $2
     GROUP BY l.id, u.first_name, u.last_name, u.avatar_url`,
    [id, tenantId]
  );
  return rows[0] || null;
}

export async function create(tenantId: string, userId: string, data: any) {
  const { rows } = await query(
    `INSERT INTO leads (
      tenant_id, name, email, phone, company, job_title, status, source,
      utm_source, utm_medium, utm_campaign, utm_term, utm_content,
      owner_id, notes, custom_fields, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    RETURNING *`,
    [
      tenantId, data.name, data.email, data.phone, data.company, data.jobTitle,
      data.status || 'new', data.source || 'manual',
      data.utmSource, data.utmMedium, data.utmCampaign, data.utmTerm, data.utmContent,
      data.ownerId || userId, data.notes, JSON.stringify(data.customFields || {}),
      userId,
    ]
  );

  // Update score asynchronously
  updateScore(rows[0].id).catch(console.error);

  return rows[0];
}

export async function update(id: string, tenantId: string, data: any) {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const updatable = ['name','email','phone','company','job_title','status','source',
    'owner_id','notes','custom_fields','temperature','score'];

  for (const key of updatable) {
    const camelKey = key.replace(/_([a-z])/g, (_, k) => k.toUpperCase());
    if (data[camelKey] !== undefined || data[key] !== undefined) {
      const val = data[camelKey] !== undefined ? data[camelKey] : data[key];
      fields.push(`${key} = $${idx}`);
      values.push(key === 'custom_fields' ? JSON.stringify(val) : val);
      idx++;
    }
  }

  if (fields.length === 0) throw new Error('Nenhum campo para atualizar');

  values.push(id, tenantId);
  const { rows } = await query(
    `UPDATE leads SET ${fields.join(', ')}, last_activity_at = NOW()
     WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`,
    values
  );
  return rows[0];
}

export async function remove(id: string, tenantId: string) {
  await query('DELETE FROM leads WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
}

export async function addActivity(leadId: string, tenantId: string, userId: string, data: any) {
  const { rows } = await query(
    `INSERT INTO lead_activities (tenant_id, lead_id, user_id, type, title, description, outcome, scheduled_at, completed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [tenantId, leadId, userId, data.type, data.title, data.description, data.outcome,
     data.scheduledAt, data.completedAt || new Date()]
  );
  await query('UPDATE leads SET last_activity_at = NOW() WHERE id = $1', [leadId]);
  return rows[0];
}

export async function getActivities(leadId: string) {
  // Buscar atividades da tabela lead_activities
  const { rows: activities } = await query(
    `SELECT la.*, u.first_name || ' ' || u.last_name as user_name, u.avatar_url as user_avatar,
            'activity' as source_table
     FROM lead_activities la
     LEFT JOIN users u ON u.id = la.user_id
     WHERE la.lead_id = $1`,
    [leadId]
  );

  // Buscar tarefas agendadas da tabela lead_tasks
  const { rows: tasks } = await query(
    `SELECT lt.id, lt.tenant_id, lt.lead_id, lt.user_id,
            lt.type, lt.title, lt.description,
            lt.due_date as scheduled_at, lt.created_at,
            lt.status, lt.completed_at,
            u.first_name || ' ' || u.last_name as user_name, u.avatar_url as user_avatar,
            'task' as source_table
     FROM lead_tasks lt
     LEFT JOIN users u ON u.id = lt.user_id
     WHERE lt.lead_id = $1`,
    [leadId]
  );

  // Combinar e ordenar por data (scheduled_at ou created_at)
  const allItems = [
    ...activities.map((a: any) => ({
      ...a,
      // Para atividades sem scheduled_at, usar created_at
      sort_date: a.scheduled_at || a.created_at
    })),
    ...tasks.map((t: any) => ({
      ...t,
      sort_date: t.scheduled_at || t.created_at
    }))
  ];

  // Ordenar por data decrescente
  allItems.sort((a: any, b: any) =>
    new Date(b.sort_date).getTime() - new Date(a.sort_date).getTime()
  );

  return allItems;
}

export async function addTag(leadId: string, tagId: string) {
  await query('INSERT INTO lead_tags (lead_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [leadId, tagId]);
}

export async function removeTag(leadId: string, tagId: string) {
  await query('DELETE FROM lead_tags WHERE lead_id = $1 AND tag_id = $2', [leadId, tagId]);
}

export async function getStats(tenantId: string) {
  const { rows } = await query(
    `SELECT
       COUNT(*) as total,
       COUNT(*) FILTER (WHERE status = 'new') as new_count,
       COUNT(*) FILTER (WHERE status = 'contacted') as contacted_count,
       COUNT(*) FILTER (WHERE status = 'qualified') as qualified_count,
       COUNT(*) FILTER (WHERE status = 'converted') as converted_count,
       COUNT(*) FILTER (WHERE temperature = 'hot') as hot_count,
       COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as last_30_days,
       AVG(score) as avg_score
     FROM leads WHERE tenant_id = $1`,
    [tenantId]
  );
  return rows[0];
}

export async function convertToOpportunity(leadId: string, tenantId: string, userId: string, data: any) {
  const lead = await findById(leadId, tenantId);
  if (!lead) throw new Error('Lead não encontrado');

  // Get default pipeline for the tenant
  const { rows: pipelineRows } = await query(
    `SELECT id FROM pipelines WHERE tenant_id = $1 AND is_default = true AND is_active = true LIMIT 1`,
    [tenantId]
  );

  if (pipelineRows.length === 0) {
    throw new Error('Nenhum pipeline padrão configurado. Configure um pipeline padrão primeiro.');
  }

  const pipelineId = pipelineRows[0].id;

  // Get first stage of the pipeline (lowest sort_order)
  const { rows: stageRows } = await query(
    `SELECT id FROM pipeline_stages WHERE pipeline_id = $1 AND tenant_id = $2 ORDER BY sort_order ASC LIMIT 1`,
    [pipelineId, tenantId]
  );

  if (stageRows.length === 0) {
    throw new Error('Pipeline não possui etapas configuradas.');
  }

  const stageId = stageRows[0].id;

  const { rows: [opp] } = await query(
    `INSERT INTO opportunities (tenant_id, lead_id, pipeline_id, stage_id, title, value, probability, expected_close, owner_id, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [tenantId, leadId, pipelineId, stageId, data.title || `Oportunidade - ${lead.name}`,
     data.value || 0, data.probability || 0, data.expected_close_date || null, data.ownerId || userId, data.notes || null, userId]
  );

  await query('UPDATE leads SET status = $1, converted_at = NOW() WHERE id = $2', ['converted', leadId]);
  return opp;
}

async function updateScore(leadId: string) {
  // Simple scoring algorithm
  const { rows: [lead] } = await query('SELECT * FROM leads WHERE id = $1', [leadId]);
  if (!lead) return;

  let score = 0;
  if (lead.email) score += 10;
  if (lead.phone) score += 10;
  if (lead.company) score += 15;
  if (lead.job_title) score += 5;
  if (lead.source === 'meta_ads') score += 20;
  if (lead.source === 'referral') score += 25;
  if (lead.utm_campaign) score += 10;

}

export async function getContacts(leadId: string, tenantId: string) {
  const { rows } = await query(
    `SELECT * FROM lead_contacts
     WHERE lead_id = $1 AND tenant_id = $2
     ORDER BY is_favorite DESC, created_at DESC`,
    [leadId, tenantId]
  );
  return rows;
}

export async function addContact(leadId: string, tenantId: string, data: any) {
  // Check against duplication if source is quadro_societario
  if (data.source === 'quadro_societario') {
    const { rows: existing } = await query(
      `SELECT id FROM lead_contacts WHERE lead_id = $1 AND name = $2 LIMIT 1`,
      [leadId, data.name]
    );
    if (existing.length > 0) {
      throw new Error('Contato já existe para este lead');
    }
  }

  const { rows } = await query(
    `INSERT INTO lead_contacts (
      tenant_id, lead_id, name, role, notes, email, phone, birth_date,
      is_favorite, is_decision_maker, source
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [
      tenantId, leadId, data.name, data.role, data.notes, data.email,
      data.phone, data.birthDate, data.isFavorite || false,
      data.isDecisionMaker || false, data.source || 'manual'
    ]
  );
  return rows[0];
}

export async function updateContact(contactId: string, tenantId: string, data: any) {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const updatable = [
    'name', 'role', 'notes', 'email', 'phone', 'birth_date',
    'is_favorite', 'is_decision_maker'
  ];

  for (const key of updatable) {
    const camelKey = key.replace(/_([a-z])/g, (_, k) => k.toUpperCase());
    if (data[camelKey] !== undefined || data[key] !== undefined) {
      const val = data[camelKey] !== undefined ? data[camelKey] : data[key];
      fields.push(`${key} = $${idx}`);
      values.push(val);
      idx++;
    }
  }

  if (fields.length === 0) throw new Error('Nenhum campo para atualizar');

  values.push(contactId, tenantId);
  const { rows } = await query(
    `UPDATE lead_contacts SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`,
    values
  );
  return rows[0];
}

export async function removeContact(contactId: string, tenantId: string) {
  await query('DELETE FROM lead_contacts WHERE id = $1 AND tenant_id = $2', [contactId, tenantId]);
}
