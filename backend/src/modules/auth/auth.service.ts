import bcrypt from 'bcryptjs';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { query } from '../../database';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { setRefreshToken, getRefreshToken, deleteRefreshToken } from '../../services/redis.service';

export async function login(email: string, password: string, totpCode?: string) {
  const { rows } = await query(
    `SELECT u.*, r.slug as role_slug, t.name as tenant_name, t.slug as tenant_slug
     FROM users u
     JOIN tenants t ON t.id = u.tenant_id
     LEFT JOIN roles r ON r.id = u.role_id
     WHERE LOWER(u.email) = LOWER($1) AND u.is_active = true`,
    [email]
  );

  const user = rows[0];
  if (!user) throw Object.assign(new Error('Credenciais inválidas'), { status: 401 });

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) throw Object.assign(new Error('Credenciais inválidas'), { status: 401 });

  // 2FA check
  if (user.two_factor_enabled) {
    if (!totpCode) {
      throw Object.assign(new Error('Código 2FA necessário'), { status: 401, require2FA: true });
    }
    const valid = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: totpCode,
      window: 1,
    });
    if (!valid) throw Object.assign(new Error('Código 2FA inválido'), { status: 401 });
  }

  // Update last login
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  const accessToken = generateAccessToken(user.id, user.tenant_id);
  const refreshToken = generateRefreshToken(user.id);
  await setRefreshToken(user.id, refreshToken);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      avatarUrl: user.avatar_url,
      role: user.role_slug,
      tenantId: user.tenant_id,
      tenantName: user.tenant_name,
      tenantSlug: user.tenant_slug,
      twoFactorEnabled: user.two_factor_enabled,
      settings: user.settings,
    },
  };
}

export async function refreshAccessToken(token: string) {
  let decoded: any;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw Object.assign(new Error('Refresh token inválido'), { status: 401 });
  }

  const storedToken = await getRefreshToken(decoded.userId);
  if (!storedToken || storedToken !== token) {
    throw Object.assign(new Error('Refresh token expirado'), { status: 401 });
  }

  const { rows } = await query(
    'SELECT id, tenant_id FROM users WHERE id = $1 AND is_active = true',
    [decoded.userId]
  );
  if (!rows[0]) throw Object.assign(new Error('Usuário inativo'), { status: 401 });

  const newAccessToken = generateAccessToken(rows[0].id, rows[0].tenant_id);
  const newRefreshToken = generateRefreshToken(rows[0].id);
  await setRefreshToken(rows[0].id, newRefreshToken);

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(userId: string) {
  await deleteRefreshToken(userId);
}

export async function getMe(userId: string) {
  const { rows } = await query(
    `SELECT u.id, u.email, u.first_name, u.last_name, u.avatar_url, u.phone,
            u.settings, u.two_factor_enabled, u.last_login_at, u.created_at,
            r.id as role_id, r.name as role_name, r.slug as role_slug,
            t.id as tenant_id, t.name as tenant_name, t.slug as tenant_slug, t.logo_url,
            ARRAY(
              SELECT p.module || ':' || p.action
              FROM role_permissions rp
              JOIN permissions p ON p.id = rp.permission_id
              WHERE rp.role_id = u.role_id
            ) as permissions
     FROM users u
     LEFT JOIN roles r ON r.id = u.role_id
     JOIN tenants t ON t.id = u.tenant_id
     WHERE u.id = $1`,
    [userId]
  );
  if (!rows[0]) throw Object.assign(new Error('Usuário não encontrado'), { status: 404 });
  return rows[0];
}

export async function forgotPassword(email: string) {
  const { rows } = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  if (!rows[0]) return; // Silent - don't reveal if email exists
  // TODO: send email with reset link
}

export async function resetPassword(token: string, newPassword: string) {
  // TODO: implement with token stored in Redis
  const hash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, token]);
}

export async function acceptInvitation(
  token: string,
  password: string,
  firstName: string,
  lastName: string
) {
  const { rows } = await query(
    `SELECT * FROM user_invitations WHERE token = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
    [token]
  );
  const invitation = rows[0];
  if (!invitation) throw Object.assign(new Error('Convite inválido ou expirado'), { status: 400 });

  const hash = await bcrypt.hash(password, 12);
  const { rows: userRows } = await query(
    `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role_id, is_active, is_email_verified, invited_by)
     VALUES ($1, $2, $3, $4, $5, $6, true, true, $7) RETURNING id, tenant_id`,
    [invitation.tenant_id, invitation.email, hash, firstName, lastName, invitation.role_id, invitation.invited_by]
  );

  await query('UPDATE user_invitations SET accepted_at = NOW() WHERE id = $1', [invitation.id]);

  const accessToken = generateAccessToken(userRows[0].id, userRows[0].tenant_id);
  const refreshToken = generateRefreshToken(userRows[0].id);
  await setRefreshToken(userRows[0].id, refreshToken);

  return { accessToken, refreshToken };
}

export async function setup2FA(userId: string) {
  const secret = speakeasy.generateSecret({ name: 'CRM', length: 20 });
  await query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [secret.base32, userId]);
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);
  return { secret: secret.base32, qrCode: qrCodeUrl };
}

export async function verify2FA(userId: string, code: string) {
  const { rows } = await query('SELECT two_factor_secret FROM users WHERE id = $1', [userId]);
  if (!rows[0]?.two_factor_secret) throw new Error('2FA não configurado');

  const valid = speakeasy.totp.verify({
    secret: rows[0].two_factor_secret,
    encoding: 'base32',
    token: code,
    window: 1,
  });
  if (!valid) throw Object.assign(new Error('Código inválido'), { status: 400 });

  await query('UPDATE users SET two_factor_enabled = true WHERE id = $1', [userId]);
}

export async function disable2FA(userId: string, code: string) {
  const { rows } = await query('SELECT two_factor_secret FROM users WHERE id = $1', [userId]);
  const valid = speakeasy.totp.verify({
    secret: rows[0].two_factor_secret,
    encoding: 'base32',
    token: code,
    window: 1,
  });
  if (!valid) throw Object.assign(new Error('Código inválido'), { status: 400 });
  await query('UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1', [userId]);
}
