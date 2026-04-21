import { query } from '../../database';
import bcrypt from 'bcryptjs';

export async function findAll(tenantId: string) {
  const { rows } = await query(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
           u.is_active, u.is_email_verified, u.created_at, u.last_login_at,
           r.id AS role_id, r.name AS role_name, r.slug AS role_slug
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.tenant_id = $1
    ORDER BY u.first_name, u.last_name
  `, [tenantId]);
  return rows;
}

export async function findById(id: string, tenantId: string) {
  const { rows } = await query(`
    SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar_url,
           u.is_active, u.is_email_verified, u.created_at, u.last_login_at,
           r.id AS role_id, r.name AS role_name, r.slug AS role_slug
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.id = $1 AND u.tenant_id = $2
  `, [id, tenantId]);
  return rows[0] || null;
}

export async function create(tenantId: string, data: any) {
  const hash = await bcrypt.hash(data.password || 'Temp@1234', 12);
  const { rows } = await query(`
    INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, phone, role_id, is_active)
    VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id, email, first_name, last_name, is_active, created_at
  `, [tenantId, data.email, hash, data.firstName, data.lastName, data.phone || null, data.roleId || null]);
  return rows[0];
}

export async function update(id: string, tenantId: string, data: any) {
  const fields: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (data.firstName !== undefined) { fields.push(`first_name = $${idx++}`); params.push(data.firstName); }
  if (data.lastName !== undefined) { fields.push(`last_name = $${idx++}`); params.push(data.lastName); }
  if (data.phone !== undefined) { fields.push(`phone = $${idx++}`); params.push(data.phone); }
  if (data.roleId !== undefined) { fields.push(`role_id = $${idx++}`); params.push(data.roleId); }
  if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); params.push(data.isActive); }
  if (data.password) {
    const hash = await bcrypt.hash(data.password, 12);
    fields.push(`password_hash = $${idx++}`);
    params.push(hash);
  }

  if (fields.length === 0) throw new Error('No fields to update');
  fields.push(`updated_at = NOW()`);

  params.push(id, tenantId);
  const { rows } = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx++} AND tenant_id = $${idx++} RETURNING id, email, first_name, last_name, is_active`,
    params
  );
  return rows[0];
}

export async function remove(id: string, tenantId: string) {
  await query('DELETE FROM users WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
}

export async function findRoles(tenantId: string) {
  const { rows } = await query(
    'SELECT id, name, slug, description, is_system FROM roles WHERE tenant_id = $1 ORDER BY name',
    [tenantId]
  );
  return rows;
}
