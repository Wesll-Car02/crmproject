import { query } from '../../database';
import { emitToTenant } from '../../services/socket.service';

export async function getConversations(tenantId: string, filters: any) {
  const { status, assignedTo, search, page = 1, limit = 50 } = filters;
  const conditions = ['c.tenant_id = $1'];
  const params: any[] = [tenantId];
  let idx = 2;

  if (status) { conditions.push(`c.status = $${idx}`); params.push(status); idx++; }
  if (assignedTo) { conditions.push(`c.assigned_to = $${idx}`); params.push(assignedTo); idx++; }

  const offset = (Number(page) - 1) * Number(limit);
  params.push(limit, offset);

  try {
    const { rows } = await query(`
      SELECT c.*,
        u.first_name || ' ' || u.last_name AS assigned_name,
        l.name AS lead_name,
        ch.name AS channel_name, ch.type AS channel_type,
        (SELECT content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
      FROM conversations c
      LEFT JOIN users u ON u.id = c.assigned_to
      LEFT JOIN leads l ON l.id = c.lead_id
      LEFT JOIN channels ch ON ch.id = c.channel_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.last_message_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, params);
    return rows;
  } catch {
    return [];
  }
}

export async function getMessages(conversationId: string, tenantId: string, before?: string) {
  try {
    const conditions = ['m.conversation_id = $1', 'c.tenant_id = $2'];
    const params: any[] = [conversationId, tenantId];
    let idx = 3;

    if (before) { conditions.push(`m.created_at < $${idx}`); params.push(before); idx++; }
    params.push(50);

    const { rows } = await query(`
      SELECT m.*, u.first_name || ' ' || u.last_name AS sender_name
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      LEFT JOIN users u ON u.id = m.sender_user_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY m.created_at DESC
      LIMIT $${idx}
    `, params);
    return rows.reverse();
  } catch {
    return [];
  }
}

export async function sendMessage(conversationId: string, tenantId: string, userId: string, data: any) {
  try {
    const { rows } = await query(`
      INSERT INTO messages (tenant_id, conversation_id, direction, type, content, sender_user_id, sender_name)
      VALUES ($1, $2, 'outbound', $3, $4, $5, $6) RETURNING *
    `, [tenantId, conversationId, data.type || 'text', data.content, userId, data.senderName || '']);

    await query(
      'UPDATE conversations SET last_message_at = NOW(), updated_at = NOW() WHERE id = $1',
      [conversationId]
    );

    // Emit real-time event
    try { emitToTenant(tenantId, 'message:new', { conversationId, message: rows[0] }); } catch { /* socket may not be ready */ }

    return rows[0];
  } catch (e) {
    throw e;
  }
}

export async function assignConversation(id: string, tenantId: string, userId: string) {
  const { rows } = await query(`
    UPDATE conversations SET assigned_to = $1, updated_at = NOW()
    WHERE id = $2 AND tenant_id = $3 RETURNING *
  `, [userId, id, tenantId]);
  return rows[0];
}

export async function resolveConversation(id: string, tenantId: string) {
  const { rows } = await query(`
    UPDATE conversations SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
    WHERE id = $1 AND tenant_id = $2 RETURNING *
  `, [id, tenantId]);
  return rows[0];
}

// Internal Chat
export async function getInternalChats(tenantId: string, userId: string) {
  try {
    const { rows } = await query(`
      SELECT ic.*,
        (SELECT im.content FROM internal_messages im WHERE im.chat_id = ic.id ORDER BY im.created_at DESC LIMIT 1) AS last_message,
        (SELECT im.created_at FROM internal_messages im WHERE im.chat_id = ic.id ORDER BY im.created_at DESC LIMIT 1) AS last_message_at
      FROM internal_chats ic
      JOIN internal_chat_members icm ON icm.chat_id = ic.id
      WHERE ic.tenant_id = $1 AND icm.user_id = $2
      ORDER BY last_message_at DESC NULLS LAST
    `, [tenantId, userId]);
    return rows;
  } catch {
    return [];
  }
}

export async function getInternalMessages(chatId: string, userId: string) {
  try {
    const { rows } = await query(`
      SELECT im.*, u.first_name || ' ' || u.last_name AS user_name,
        u.first_name AS first_name
      FROM internal_messages im
      JOIN users u ON u.id = im.user_id
      WHERE im.chat_id = $1
      ORDER BY im.created_at ASC
      LIMIT 100
    `, [chatId]);
    return rows;
  } catch {
    return [];
  }
}

export async function sendInternalMessage(chatId: string, userId: string, content: string, type = 'text') {
  const { rows: userRows } = await query('SELECT tenant_id FROM users WHERE id = $1', [userId]);
  const { rows } = await query(`
    INSERT INTO internal_messages (chat_id, user_id, type, content) VALUES ($1, $2, $3, $4) RETURNING *
  `, [chatId, userId, type, content]);

  const msg = rows[0];
  if (userRows[0]?.tenant_id) {
    try { emitToTenant(userRows[0].tenant_id, 'internal_message:new', { chatId, message: msg }); } catch { /* socket may not be ready */ }
  }
  return msg;
}

export async function createDirectChat(tenantId: string, userId: string, targetUserId: string) {
  // Check if already exists
  const { rows: existing } = await query(`
    SELECT ic.id FROM internal_chats ic
    JOIN internal_chat_members m1 ON m1.chat_id = ic.id AND m1.user_id = $1
    JOIN internal_chat_members m2 ON m2.chat_id = ic.id AND m2.user_id = $2
    WHERE ic.tenant_id = $3 AND ic.type = 'direct'
    LIMIT 1
  `, [userId, targetUserId, tenantId]);

  if (existing[0]) return existing[0];

  const { rows } = await query(`
    INSERT INTO internal_chats (tenant_id, type, created_by) VALUES ($1, 'direct', $2) RETURNING *
  `, [tenantId, userId]);

  const chat = rows[0];
  await query('INSERT INTO internal_chat_members (chat_id, user_id) VALUES ($1,$2),($1,$3)', [chat.id, userId, targetUserId]);

  return chat;
}
