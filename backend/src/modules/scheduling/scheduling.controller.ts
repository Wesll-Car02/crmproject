import { Request, Response } from 'express';
import * as svc from './scheduling.service';

export async function list(req: Request, res: Response) {
  res.json(await svc.findSchedules(req.user!.tenantId, req.query));
}

export async function create(req: Request, res: Response) {
  const data = await svc.createSchedule(req.user!.tenantId, req.user!.id, req.body);
  res.status(201).json(data);
}

export async function update(req: Request, res: Response) {
  const data = await svc.updateSchedule(req.params.id, req.user!.tenantId, req.body);
  res.json(data);
}

export async function remove(req: Request, res: Response) {
  await svc.deleteSchedule(req.params.id, req.user!.tenantId);
  res.status(204).send();
}

// Public availability endpoints
export async function getPublicAvailability(req: Request, res: Response) {
  try {
    const { userSlug } = req.params;
    const { date } = req.query;

    if (!date || typeof date !== 'string') {
      res.status(400).json({ error: 'Parâmetro "date" é obrigatório (formato: YYYY-MM-DD)' });
      return;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD' });
      return;
    }

    const availability = await svc.getAvailableSlots(userSlug, date);
    res.json(availability);
  } catch (error: any) {
    if (error.message === 'Usuário não encontrado') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Erro ao buscar disponibilidade' });
    }
  }
}

export async function checkPublicAvailability(req: Request, res: Response) {
  try {
    const { userSlug } = req.params;
    const { startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      res.status(400).json({ error: 'startTime e endTime são obrigatórios' });
      return;
    }

    const isAvailable = await svc.checkSlotAvailability(userSlug, startTime, endTime);
    res.json({ available: isAvailable });
  } catch (error: any) {
    if (error.message === 'Usuário não encontrado') {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Erro ao verificar disponibilidade' });
    }
  }
}

export async function bookPublic(req: Request, res: Response) {
  try {
    const data = await svc.createPublicBooking(req.params.userSlug, req.body);
    res.status(201).json(data);
  } catch (error: any) {
    if (error.message === 'Agente não encontrado') {
      res.status(404).json({ error: error.message });
    } else if (error.message.includes('não está mais disponível')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Erro ao agendar reunião' });
    }
  }
}

// Lead Tasks
export async function listLeadTasks(req: Request, res: Response) {
  res.json(await svc.getLeadTasks(req.params.leadId, req.user!.tenantId));
}

export async function listUpcomingTasks(req: Request, res: Response) {
  res.json(await svc.getUpcomingTasks(req.user!.tenantId, req.user!.id));
}

export async function createLeadTask(req: Request, res: Response) {
  const task = await svc.createLeadTask(req.user!.tenantId, req.user!.id, req.body);
  res.status(201).json(task);
}

export async function completeTask(req: Request, res: Response) {
  const task = await svc.completeTask(req.params.id, req.user!.tenantId);
  res.json(task);
}

export async function updateTask(req: Request, res: Response) {
  const task = await svc.updateTask(req.params.id, req.user!.tenantId, req.body);
  res.json(task);
}

export async function deleteTask(req: Request, res: Response) {
  await svc.deleteTask(req.params.id, req.user!.tenantId);
  res.status(204).send();
}

// Google OAuth
export async function googleAuthStart(req: Request, res: Response) {
  const url = svc.getGoogleAuthUrl(req.user!.id);
  res.json({ url });
}

export async function googleAuthCallback(req: Request, res: Response) {
  const { code, state } = req.query as any;
  let userId = req.user?.id;

  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = decoded.userId || userId;
    } catch { /* ignore */ }
  }

  await svc.handleGoogleCallback(code, userId!, req.user?.tenantId || '');
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/scheduling?google=connected`);
}

// Microsoft OAuth
export async function microsoftAuthStart(req: Request, res: Response) {
  const url = svc.getMicrosoftAuthUrl(req.user!.id);
  res.json({ url });
}

export async function microsoftAuthCallback(req: Request, res: Response) {
  const { code, state } = req.query as any;
  let userId = req.user?.id;

  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = decoded.userId || userId;
    } catch { /* ignore */ }
  }

  await svc.handleMicrosoftCallback(code, userId!, req.user?.tenantId || '');
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/scheduling?microsoft=connected`);
}

export async function listIntegrations(req: Request, res: Response) {
  res.json(await svc.getCalendarIntegrations(req.user!.id));
}

export async function disconnectCalendar(req: Request, res: Response) {
  await svc.disconnectCalendar(req.user!.id, req.params.provider);
  res.status(204).send();
}
