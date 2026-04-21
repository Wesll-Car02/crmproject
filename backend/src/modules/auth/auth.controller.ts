import { Request, Response } from 'express';
import * as authService from './auth.service';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
  totpCode: z.string().optional(),
});

export async function login(req: Request, res: Response): Promise<void> {
  const body = loginSchema.parse(req.body);
  const result = await authService.login(body.email, body.password, body.totpCode);
  res.json(result);
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token obrigatório' });
    return;
  }
  const result = await authService.refreshAccessToken(refreshToken);
  res.json(result);
}

export async function logout(req: Request, res: Response): Promise<void> {
  await authService.logout(req.user!.id);
  res.json({ message: 'Logout realizado com sucesso' });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await authService.getMe(req.user!.id);
  res.json(user);
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const { email } = req.body;
  await authService.forgotPassword(email);
  res.json({ message: 'Se o email existir, enviaremos as instruções de recuperação' });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { token, password } = req.body;
  await authService.resetPassword(token, password);
  res.json({ message: 'Senha alterada com sucesso' });
}

export async function acceptInvitation(req: Request, res: Response): Promise<void> {
  const { token, password, firstName, lastName } = req.body;
  const result = await authService.acceptInvitation(token, password, firstName, lastName);
  res.json(result);
}

export async function setup2FA(req: Request, res: Response): Promise<void> {
  const result = await authService.setup2FA(req.user!.id);
  res.json(result);
}

export async function verify2FA(req: Request, res: Response): Promise<void> {
  const { code } = req.body;
  await authService.verify2FA(req.user!.id, code);
  res.json({ message: '2FA ativado com sucesso' });
}

export async function disable2FA(req: Request, res: Response): Promise<void> {
  const { code } = req.body;
  await authService.disable2FA(req.user!.id, code);
  res.json({ message: '2FA desativado' });
}
