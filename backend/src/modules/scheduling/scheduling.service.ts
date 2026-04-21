import { query } from '../../database';
import crypto from 'crypto';
import { config } from '../../config';
import { addMinutes, format, parseISO, startOfDay, endOfDay, isWithinInterval, parse } from 'date-fns';

// ─── Schedules ───────────────────────────────────────────────────────────────

export async function findSchedules(tenantId: string, filters: any) {
  const { userId, dateFrom, dateTo, page = 1, limit = 100 } = filters;
  const conditions = ['s.tenant_id = $1'];
  const params: any[] = [tenantId];
  let idx = 2;

  if (userId) { conditions.push(`s.owner_id = $${idx}`); params.push(userId); idx++; }
  if (dateFrom) { conditions.push(`s.start_at >= $${idx}`); params.push(dateFrom); idx++; }
  if (dateTo) { conditions.push(`s.start_at <= $${idx}`); params.push(dateTo); idx++; }

  const offset = (Number(page) - 1) * Number(limit);

  try {
    const { rows } = await query(`
      SELECT s.*,
        s.start_at AS start_time, s.end_at AS end_time, s.meet_url AS meeting_link,
        u.first_name || ' ' || u.last_name AS user_name
      FROM schedules s
      LEFT JOIN users u ON u.id = s.owner_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY s.start_at ASC
      LIMIT $${idx} OFFSET $${idx + 1}
    `, [...params, limit, offset]);
    return rows;
  } catch {
    return [];
  }
}

export async function createSchedule(tenantId: string, userId: string, data: any) {
  const meetUrl = data.meetingLink || `https://meet.jit.si/crm-${crypto.randomBytes(6).toString('hex')}`;

  const { rows } = await query(`
    INSERT INTO schedules (tenant_id, owner_id, title, description, start_at, end_at, type, meet_url, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *,
      start_at AS start_time, end_at AS end_time, meet_url AS meeting_link
  `, [tenantId, data.userId || userId, data.title, data.description, data.startTime, data.endTime, data.type || 'meeting', meetUrl, userId]);

  return rows[0];
}

export async function updateSchedule(id: string, tenantId: string, data: any) {
  const { rows } = await query(`
    UPDATE schedules
    SET title = COALESCE($1, title),
        start_at = COALESCE($2, start_at),
        end_at = COALESCE($3, end_at),
        description = COALESCE($4, description),
        type = COALESCE($5, type),
        updated_at = NOW()
    WHERE id = $6 AND tenant_id = $7
    RETURNING *, start_at AS start_time, end_at AS end_time, meet_url AS meeting_link
  `, [data.title, data.startTime, data.endTime, data.description, data.type, id, tenantId]);
  return rows[0];
}

export async function deleteSchedule(id: string, tenantId: string) {
  await query('DELETE FROM schedules WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
}

// ─── Public Booking Availability ─────────────────────────────────────────────

export interface TimeSlot {
  time: string;
  label: string;
  available: boolean;
  startTime: string; // ISO string
  endTime: string;   // ISO string
}

export interface AvailabilityResponse {
  date: string;
  userSlug: string;
  userName: string;
  timezone: string;
  availableSlots: TimeSlot[];
}

/**
 * Get available time slots for a user on a specific date
 */
export async function getAvailableSlots(userSlug: string, dateString: string): Promise<AvailabilityResponse> {
  // Get user info
  const { rows: users } = await query(
    'SELECT id, first_name, last_name, timezone FROM users WHERE id = $1',
    [userSlug]
  );

  const user = users[0];
  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  const date = parseISO(dateString);
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Get working hours for this day
  const { rows: workingHours } = await query(
    'SELECT start_time, end_time FROM user_working_hours WHERE user_id = $1 AND day_of_week = $2 AND is_active = true',
    [user.id, dayOfWeek]
  );

  if (workingHours.length === 0) {
    // No working hours configured for this day
    return {
      date: dateString,
      userSlug,
      userName: `${user.first_name} ${user.last_name}`,
      timezone: user.timezone || 'America/Sao_Paulo',
      availableSlots: []
    };
  }

  // Check for absences on this date
  const { rows: absences } = await query(
    'SELECT 1 FROM user_absences WHERE user_id = $1 AND $2 BETWEEN start_date AND end_date',
    [user.id, dateString]
  );

  if (absences.length > 0) {
    // User has absence on this date
    return {
      date: dateString,
      userSlug,
      userName: `${user.first_name} ${user.last_name}`,
      timezone: user.timezone || 'America/Sao_Paulo',
      availableSlots: []
    };
  }

  // Get existing bookings for this date
  const startOfDate = startOfDay(date).toISOString();
  const endOfDate = endOfDay(date).toISOString();

  const { rows: existingBookings } = await query(
    `SELECT start_at, end_at FROM schedules
     WHERE owner_id = $1
       AND start_at >= $2
       AND start_at <= $3
       AND status = 'scheduled'`,
    [user.id, startOfDate, endOfDate]
  );

  // Generate time slots (30-minute intervals)
  const slots: TimeSlot[] = [];
  const slotDuration = 30; // minutes
  const meetingDuration = 60; // minutes for a standard meeting

  for (const workingHour of workingHours) {
    const startTime = parse(workingHour.start_time, 'HH:mm:ss', date);
    const endTime = parse(workingHour.end_time, 'HH:mm:ss', date);

    let currentTime = startTime;

    while (currentTime < endTime) {
      const slotEndTime = addMinutes(currentTime, meetingDuration);

      // Check if slot fits within working hours
      if (slotEndTime <= endTime) {
        const slotStartISO = currentTime.toISOString();
        const slotEndISO = slotEndTime.toISOString();

        // Check for conflicts with existing bookings
        const hasConflict = existingBookings.some(booking => {
          const bookingStart = new Date(booking.start_at);
          const bookingEnd = new Date(booking.end_at);

          return (
            (currentTime >= bookingStart && currentTime < bookingEnd) ||
            (slotEndTime > bookingStart && slotEndTime <= bookingEnd) ||
            (currentTime <= bookingStart && slotEndTime >= bookingEnd)
          );
        });

        const timeStr = format(currentTime, 'HH:mm');
        const label = format(currentTime, 'h:mm a');

        slots.push({
          time: timeStr,
          label,
          available: !hasConflict,
          startTime: slotStartISO,
          endTime: slotEndISO
        });
      }

      currentTime = addMinutes(currentTime, slotDuration);
    }
  }

  return {
    date: dateString,
    userSlug,
    userName: `${user.first_name} ${user.last_name}`,
    timezone: user.timezone || 'America/Sao_Paulo',
    availableSlots: slots
  };
}

/**
 * Check if a specific time slot is available
 */
export async function checkSlotAvailability(userSlug: string, startTimeISO: string, endTimeISO: string): Promise<boolean> {
  const { rows: users } = await query(
    'SELECT id FROM users WHERE id = $1',
    [userSlug]
  );

  const user = users[0];
  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  const startTime = new Date(startTimeISO);
  const dateString = format(startTime, 'yyyy-MM-dd');
  const dayOfWeek = startTime.getDay();
  const timeStr = format(startTime, 'HH:mm:ss');

  // Check working hours
  const { rows: workingHours } = await query(
    `SELECT 1 FROM user_working_hours
     WHERE user_id = $1
       AND day_of_week = $2
       AND is_active = true
       AND start_time <= $3
       AND end_time >= $4`,
    [user.id, dayOfWeek, timeStr, format(new Date(endTimeISO), 'HH:mm:ss')]
  );

  if (workingHours.length === 0) {
    return false; // Outside working hours
  }

  // Check absences
  const { rows: absences } = await query(
    'SELECT 1 FROM user_absences WHERE user_id = $1 AND $2 BETWEEN start_date AND end_date',
    [user.id, dateString]
  );

  if (absences.length > 0) {
    return false; // User has absence on this date
  }

  // Check for scheduling conflicts
  const { rows: conflicts } = await query(
    `SELECT 1 FROM schedules
     WHERE owner_id = $1
       AND status = 'scheduled'
       AND (
         (start_at <= $2 AND end_at > $2) OR
         (start_at < $3 AND end_at >= $3) OR
         (start_at >= $2 AND end_at <= $3)
       )`,
    [user.id, startTimeISO, endTimeISO]
  );

  return conflicts.length === 0; // Available if no conflicts
}

export async function createPublicBooking(userSlug: string, data: any) {
  // First check if the slot is available
  const isAvailable = await checkSlotAvailability(userSlug, data.startTime, data.endTime);

  if (!isAvailable) {
    throw new Error('Este horário não está mais disponível. Por favor, selecione outro horário.');
  }

  const { rows: users } = await query('SELECT id, tenant_id FROM users WHERE id = $1', [userSlug]);
  const user = users[0];
  if (!user) throw new Error('Agente não encontrado');

  const meetUrl = `https://meet.jit.si/crm-public-${crypto.randomBytes(6).toString('hex')}`;

  const { rows } = await query(`
    INSERT INTO schedules (tenant_id, owner_id, title, description, start_at, end_at, type, meet_url)
    VALUES ($1, $2, $3, $4, $5, $6, 'meeting', $7)
    RETURNING *, start_at AS start_time, end_at AS end_time, meet_url AS meeting_link
  `, [user.tenant_id, user.id, `Reunião com ${data.guestName}`, data.guestEmail + ' - ' + (data.notes || ''), data.startTime, data.endTime, meetUrl]);

  return rows[0];
}

// ─── Lead Tasks ───────────────────────────────────────────────────────────────

export async function createLeadTask(tenantId: string, userId: string, data: any) {
  const { rows } = await query(`
    INSERT INTO lead_tasks (tenant_id, lead_id, opportunity_id, user_id, type, title, description, due_date, created_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
  `, [tenantId, data.leadId || null, data.opportunityId || null, data.userId || userId, data.type, data.title, data.description || null, data.dueDate || null, userId]);

  // Atualizar last_activity_at do lead se houver leadId
  if (data.leadId) {
    await query('UPDATE leads SET last_activity_at = NOW() WHERE id = $1', [data.leadId]);
  }

  return rows[0];
}

export async function getLeadTasks(leadId: string, tenantId: string) {
  try {
    const { rows } = await query(`
      SELECT lt.*, u.first_name || ' ' || u.last_name AS user_name
      FROM lead_tasks lt
      LEFT JOIN users u ON u.id = lt.user_id
      WHERE lt.lead_id = $1 AND lt.tenant_id = $2
      ORDER BY lt.due_date ASC NULLS LAST, lt.created_at DESC
    `, [leadId, tenantId]);
    return rows;
  } catch {
    return [];
  }
}

export async function getUpcomingTasks(tenantId: string, userId: string) {
  try {
    const { rows } = await query(`
      SELECT lt.*, u.first_name || ' ' || u.last_name AS user_name,
        l.name AS lead_name
      FROM lead_tasks lt
      LEFT JOIN users u ON u.id = lt.user_id
      LEFT JOIN leads l ON l.id = lt.lead_id
      WHERE lt.tenant_id = $1 AND lt.user_id = $2 AND lt.status = 'pending'
      ORDER BY lt.due_date ASC NULLS LAST
      LIMIT 50
    `, [tenantId, userId]);
    return rows;
  } catch {
    return [];
  }
}

export async function completeTask(id: string, tenantId: string) {
  try {
    const { rows } = await query(`
      UPDATE lead_tasks SET status = 'done', completed_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2 RETURNING *
    `, [id, tenantId]);
    return rows[0];
  } catch {
    return null;
  }
}

export async function updateTask(id: string, tenantId: string, data: any) {
  try {
    const { rows } = await query(`
      UPDATE lead_tasks
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          due_date = COALESCE($3, due_date),
          type = COALESCE($4, type),
          status = COALESCE($5, status),
          updated_at = NOW()
      WHERE id = $6 AND tenant_id = $7 RETURNING *
    `, [data.title, data.description, data.dueDate, data.type, data.status, id, tenantId]);
    return rows[0];
  } catch {
    return null;
  }
}

export async function deleteTask(id: string, tenantId: string) {
  await query('DELETE FROM lead_tasks WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
}

// ─── Google Calendar OAuth ────────────────────────────────────────────────────

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar';

export function getGoogleAuthUrl(userId: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const redirectUri = `${config.appUrl}/api/scheduling/auth/google/callback`;
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function handleGoogleCallback(code: string, userId: string, tenantId: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
  const redirectUri = `${config.appUrl}/api/scheduling/auth/google/callback`;

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });

  const tokens: any = await response.json();
  if (!tokens.access_token) throw new Error('Falha na autenticação com Google');

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await query(`
    INSERT INTO calendar_integrations (tenant_id, user_id, provider, access_token, refresh_token, expires_at)
    VALUES ($1, $2, 'google', $3, $4, $5)
    ON CONFLICT (user_id, provider) DO UPDATE
    SET access_token = $3, refresh_token = COALESCE($4, calendar_integrations.refresh_token), expires_at = $5
  `, [tenantId, userId, tokens.access_token, tokens.refresh_token || null, expiresAt]);

  return { success: true };
}

// ─── Microsoft Calendar OAuth ─────────────────────────────────────────────────

const MS_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MS_SCOPES = 'Calendars.ReadWrite offline_access';

export function getMicrosoftAuthUrl(userId: string): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID || '';
  const redirectUri = `${config.appUrl}/api/scheduling/auth/microsoft/callback`;
  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: MS_SCOPES,
    state,
  });

  return `${MS_AUTH_URL}?${params}`;
}

export async function handleMicrosoftCallback(code: string, userId: string, tenantId: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID || '';
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET || '';
  const redirectUri = `${config.appUrl}/api/scheduling/auth/microsoft/callback`;

  const response = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code', scope: MS_SCOPES }),
  });

  const tokens: any = await response.json();
  if (!tokens.access_token) throw new Error('Falha na autenticação com Microsoft');

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await query(`
    INSERT INTO calendar_integrations (tenant_id, user_id, provider, access_token, refresh_token, expires_at)
    VALUES ($1, $2, 'microsoft', $3, $4, $5)
    ON CONFLICT (user_id, provider) DO UPDATE
    SET access_token = $3, refresh_token = COALESCE($4, calendar_integrations.refresh_token), expires_at = $5
  `, [tenantId, userId, tokens.access_token, tokens.refresh_token || null, expiresAt]);

  return { success: true };
}

export async function getCalendarIntegrations(userId: string) {
  try {
    const { rows } = await query(
      'SELECT provider, sync_enabled, expires_at, created_at FROM calendar_integrations WHERE user_id = $1',
      [userId]
    );
    return rows;
  } catch {
    return [];
  }
}

export async function disconnectCalendar(userId: string, provider: string) {
  await query('DELETE FROM calendar_integrations WHERE user_id = $1 AND provider = $2', [userId, provider]);
}
