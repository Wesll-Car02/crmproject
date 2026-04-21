import { query } from '../../database';

export async function findAll(tenantId: string, filters: any) {
  const { pipelineId, stageId, ownerId, status, search, page = 1, limit = 100 } = filters;
  const conditions = ['o.tenant_id = $1'];
  const params: any[] = [tenantId];
  let idx = 2;

  if (pipelineId) { conditions.push(`o.pipeline_id = $${idx}`); params.push(pipelineId); idx++; }
  if (stageId) { conditions.push(`o.stage_id = $${idx}`); params.push(stageId); idx++; }
  if (ownerId) { conditions.push(`o.owner_id = $${idx}`); params.push(ownerId); idx++; }
  if (status) { conditions.push(`o.status = $${idx}`); params.push(status); idx++; }
  if (search) {
    conditions.push(`(o.title ILIKE $${idx} OR l.name ILIKE $${idx})`);
    params.push(`%${search}%`); idx++;
  }

  const offset = (Number(page) - 1) * Number(limit);
  params.push(limit, offset);

  const { rows } = await query(`
    SELECT
      o.*,
      ps.name AS stage_name, ps.color AS stage_color,
      u.first_name || ' ' || u.last_name AS owner_name,
      l.name AS lead_name,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color))
        FILTER (WHERE t.id IS NOT NULL), '[]'
      ) AS tags
    FROM opportunities o
    LEFT JOIN pipeline_stages ps ON ps.id = o.stage_id
    LEFT JOIN users u ON u.id = o.owner_id
    LEFT JOIN leads l ON l.id = o.lead_id
    LEFT JOIN opportunity_tag_links otl ON otl.opportunity_id = o.id
    LEFT JOIN tags t ON t.id = otl.tag_id
    WHERE ${conditions.join(' AND ')}
    GROUP BY o.id, ps.name, ps.color, u.first_name, u.last_name, l.name
    ORDER BY o.created_at DESC
    LIMIT $${idx} OFFSET $${idx + 1}
  `, params);

  // Query de contagem (sem limit e offset)
  const countParams = params.slice(0, -2); // Remove limit e offset
  const { rows: countRows } = await query(
    `SELECT COUNT(*) FROM opportunities o LEFT JOIN leads l ON l.id = o.lead_id WHERE ${conditions.join(' AND ')}`,
    countParams
  );

  return { data: rows, total: parseInt(countRows[0].count) };
}

export async function findById(id: string, tenantId: string) {
  const { rows } = await query(`
    SELECT
      o.*,
      ps.name AS stage_name, ps.color AS stage_color,
      p.name AS pipeline_name,
      u.first_name || ' ' || u.last_name AS owner_name,
      l.name AS lead_name,
      COALESCE(
        json_agg(DISTINCT jsonb_build_object('id', t.id, 'name', t.name, 'color', t.color))
        FILTER (WHERE t.id IS NOT NULL), '[]'
      ) AS tags
    FROM opportunities o
    LEFT JOIN pipeline_stages ps ON ps.id = o.stage_id
    LEFT JOIN pipelines p ON p.id = o.pipeline_id
    LEFT JOIN users u ON u.id = o.owner_id
    LEFT JOIN leads l ON l.id = o.lead_id
    LEFT JOIN opportunity_tag_links otl ON otl.opportunity_id = o.id
    LEFT JOIN tags t ON t.id = otl.tag_id
    WHERE o.id = $1 AND o.tenant_id = $2
    GROUP BY o.id, ps.name, ps.color, p.name, u.first_name, u.last_name, l.name
  `, [id, tenantId]);
  return rows[0] || null;
}

export async function create(tenantId: string, userId: string, data: any) {
  const { rows } = await query(`
    INSERT INTO opportunities (
      tenant_id, pipeline_id, stage_id, lead_id, title, value, currency,
      probability, expected_close, status, owner_id, source, notes, custom_fields, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10,$11,$12,$13,$14)
    RETURNING *
  `, [
    tenantId, data.pipelineId, data.stageId, data.leadId || null,
    data.title, data.value || 0, data.currency || 'BRL',
    data.probability || 0, data.expectedClose || null,
    data.ownerId || userId, data.source || null,
    data.notes || null, JSON.stringify(data.customFields || {}), userId
  ]);

  const opp = rows[0];

  if (data.tagIds?.length) {
    for (const tagId of data.tagIds) {
      await query(
        'INSERT INTO opportunity_tag_links (opportunity_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [opp.id, tagId]
      );
    }
  }

  await query(
    `INSERT INTO opportunity_history (opportunity_id, user_id, to_stage_id)
     VALUES ($1, $2, $3)`,
    [opp.id, userId, data.stageId]
  );

  return findById(opp.id, tenantId);
}

export async function update(id: string, tenantId: string, data: any) {
  const fields: string[] = [];
  const params: any[] = [];
  let idx = 1;

  const updatable: Record<string, string> = {
    title: 'title', value: 'value', probability: 'probability',
    expectedClose: 'expected_close', status: 'status', ownerId: 'owner_id',
    notes: 'notes', source: 'source', customFields: 'custom_fields',
  };

  for (const [key, col] of Object.entries(updatable)) {
    if (data[key] !== undefined) {
      fields.push(`${col} = $${idx}`);
      params.push(key === 'customFields' ? JSON.stringify(data[key]) : data[key]);
      idx++;
    }
  }

  if (!fields.length) return findById(id, tenantId);

  params.push(id, tenantId);
  await query(
    `UPDATE opportunities SET ${fields.join(', ')}, updated_at = NOW()
     WHERE id = $${idx} AND tenant_id = $${idx + 1}`,
    params
  );

  if (data.tagIds !== undefined) {
    await query('DELETE FROM opportunity_tag_links WHERE opportunity_id = $1', [id]);
    for (const tagId of data.tagIds) {
      await query(
        'INSERT INTO opportunity_tag_links (opportunity_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [id, tagId]
      );
    }
  }

  return findById(id, tenantId);
}

export async function remove(id: string, tenantId: string) {
  await query('DELETE FROM opportunities WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
}

export async function moveStage(id: string, tenantId: string, userId: string, stageId: string) {
  const current = await findById(id, tenantId);
  if (!current) throw new Error('Oportunidade não encontrada');

  await query(
    'UPDATE opportunities SET stage_id = $1, last_activity_at = NOW(), updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
    [stageId, id, tenantId]
  );

  await query(
    `INSERT INTO opportunity_history (opportunity_id, user_id, from_stage_id, to_stage_id, from_value, to_value)
     VALUES ($1, $2, $3, $4, $5, $5)`,
    [id, userId, current.stage_id, stageId, current.value]
  );

  return findById(id, tenantId);
}

export async function getPipelines(tenantId: string) {
  const { rows } = await query(`
    SELECT p.*,
      COALESCE(
        json_agg(ps ORDER BY ps.sort_order) FILTER (WHERE ps.id IS NOT NULL), '[]'
      ) AS stages
    FROM pipelines p
    LEFT JOIN pipeline_stages ps ON ps.pipeline_id = p.id
    WHERE p.tenant_id = $1 AND p.is_active = true
    GROUP BY p.id
    ORDER BY p.is_default DESC, p.name ASC
  `, [tenantId]);
  return rows;
}

export async function createPipeline(tenantId: string, userId: string, data: any) {
  const { rows } = await query(`
    INSERT INTO pipelines (tenant_id, name, description, is_default, created_by)
    VALUES ($1, $2, $3, $4, $5) RETURNING *
  `, [tenantId, data.name, data.description || null, data.isDefault || false, userId]);
  return rows[0];
}

export async function updatePipeline(id: string, tenantId: string, data: any) {
  const { rows } = await query(`
    UPDATE pipelines SET name = COALESCE($1, name), description = COALESCE($2, description),
    is_default = COALESCE($3, is_default), updated_at = NOW()
    WHERE id = $4 AND tenant_id = $5 RETURNING *
  `, [data.name, data.description, data.isDefault, id, tenantId]);
  return rows[0];
}

export async function deletePipeline(id: string, tenantId: string) {
  await query('UPDATE pipelines SET is_active = false WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
}

export async function createStage(pipelineId: string, tenantId: string, data: any) {
  const { rows: maxRows } = await query(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM pipeline_stages WHERE pipeline_id = $1',
    [pipelineId]
  );
  const { rows } = await query(`
    INSERT INTO pipeline_stages (pipeline_id, tenant_id, name, color, sort_order, probability, is_won, is_lost)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
  `, [
    pipelineId, tenantId, data.name, data.color || '#6366f1',
    maxRows[0].next_order, data.probability || 0,
    data.isWon || false, data.isLost || false
  ]);
  return rows[0];
}

export async function updateStage(id: string, tenantId: string, data: any) {
  const { rows } = await query(`
    UPDATE pipeline_stages
    SET name = COALESCE($1, name), color = COALESCE($2, color),
        sort_order = COALESCE($3, sort_order), probability = COALESCE($4, probability),
        is_won = COALESCE($5, is_won), is_lost = COALESCE($6, is_lost)
    WHERE id = $7 AND tenant_id = $8 RETURNING *
  `, [data.name, data.color, data.sortOrder, data.probability, data.isWon, data.isLost, id, tenantId]);
  return rows[0];
}

export async function updateStageOrder(id: string, tenantId: string, sortOrder: number) {
  // Primeiro, buscar a etapa que está sendo movida
  const { rows: stageRows } = await query(
    'SELECT pipeline_id, sort_order FROM pipeline_stages WHERE id = $1 AND tenant_id = $2',
    [id, tenantId]
  );

  if (stageRows.length === 0) {
    throw new Error('Etapa não encontrada');
  }

  const stage = stageRows[0];
  const oldOrder = stage.sort_order;
  const pipelineId = stage.pipeline_id;

  // Se a nova ordem for igual à antiga, não fazer nada
  if (oldOrder === sortOrder) {
    const { rows } = await query(
      'SELECT * FROM pipeline_stages WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return rows[0];
  }

  // Atualizar a ordem de todas as etapas no pipeline
  if (sortOrder < oldOrder) {
    // Movendo para cima (ordem menor) - incrementar etapas entre nova e antiga posição
    await query(`
      UPDATE pipeline_stages
      SET sort_order = sort_order + 1
      WHERE pipeline_id = $1 AND tenant_id = $2
        AND sort_order >= $3 AND sort_order < $4
        AND id != $5
    `, [pipelineId, tenantId, sortOrder, oldOrder, id]);
  } else {
    // Movendo para baixo (ordem maior) - decrementar etapas entre antiga e nova posição
    await query(`
      UPDATE pipeline_stages
      SET sort_order = sort_order - 1
      WHERE pipeline_id = $1 AND tenant_id = $2
        AND sort_order > $3 AND sort_order <= $4
        AND id != $5
    `, [pipelineId, tenantId, oldOrder, sortOrder, id]);
  }

  // Atualizar a etapa movida para a nova ordem
  const { rows } = await query(`
    UPDATE pipeline_stages
    SET sort_order = $1
    WHERE id = $2 AND tenant_id = $3 RETURNING *
  `, [sortOrder, id, tenantId]);

  return rows[0];
}

export async function deleteStage(id: string, tenantId: string) {
  await query('DELETE FROM pipeline_stages WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
}

export async function getStats(tenantId: string) {
  const { rows: stageStats } = await query(`
    SELECT ps.name AS stage, COUNT(o.id) AS count, COALESCE(SUM(o.value), 0) AS total_value
    FROM pipeline_stages ps
    LEFT JOIN opportunities o ON o.stage_id = ps.id AND o.tenant_id = $1 AND o.status = 'open'
    WHERE ps.tenant_id = $1
    GROUP BY ps.id, ps.name, ps.sort_order
    ORDER BY ps.sort_order
  `, [tenantId]);

  const { rows: summary } = await query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'open') AS open_count,
      COUNT(*) FILTER (WHERE status = 'won') AS won_count,
      COUNT(*) FILTER (WHERE status = 'lost') AS lost_count,
      COALESCE(SUM(value) FILTER (WHERE status = 'open'), 0) AS pipeline_value,
      COALESCE(SUM(value) FILTER (WHERE status = 'won'), 0) AS won_value
    FROM opportunities WHERE tenant_id = $1
  `, [tenantId]);

  return { stages: stageStats, summary: summary[0] };
}

export async function getActivities(opportunityId: string) {
  const { rows } = await query(`
    SELECT oa.*, u.first_name || ' ' || u.last_name AS user_name
    FROM opportunity_activities oa
    LEFT JOIN users u ON u.id = oa.user_id
    WHERE oa.opportunity_id = $1
    ORDER BY oa.created_at DESC
  `, [opportunityId]);
  return rows;
}

export async function addActivity(opportunityId: string, tenantId: string, userId: string, data: any) {
  const { rows } = await query(`
    INSERT INTO opportunity_activities (tenant_id, opportunity_id, user_id, type, title, description, scheduled_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
  `, [tenantId, opportunityId, userId, data.type, data.title, data.description, data.scheduledAt || null]);

  await query(
    'UPDATE opportunities SET last_activity_at = NOW(), updated_at = NOW() WHERE id = $1',
    [opportunityId]
  );

  return rows[0];
}
