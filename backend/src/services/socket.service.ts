import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../database';

export function setupSocket(io: SocketServer): void {
  // Auth middleware for socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      const { rows } = await query(
        'SELECT id, tenant_id, first_name, last_name FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId]
      );
      if (!rows[0]) return next(new Error('User not found'));
      (socket as any).user = rows[0];
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    console.log(`🔌 Socket connected: ${user.first_name} ${user.last_name}`);

    // Join tenant room
    socket.join(`tenant:${user.tenant_id}`);
    socket.join(`user:${user.id}`);

    // Emit online status
    socket.to(`tenant:${user.tenant_id}`).emit('user:online', { userId: user.id });

    // Internal chat
    socket.on('chat:join', (chatId: string) => socket.join(`chat:${chatId}`));
    socket.on('chat:leave', (chatId: string) => socket.leave(`chat:${chatId}`));
    socket.on('chat:typing', (chatId: string) => {
      socket.to(`chat:${chatId}`).emit('chat:typing', { userId: user.id, chatId });
    });

    // Conversation (customer chat)
    socket.on('conversation:join', (convId: string) => socket.join(`conv:${convId}`));

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${user.first_name}`);
      socket.to(`tenant:${user.tenant_id}`).emit('user:offline', { userId: user.id });
    });
  });
}

// Utility to emit events from other services
let _io: SocketServer;
export function getIO(): SocketServer {
  if (!_io) throw new Error('Socket.io not initialized');
  return _io;
}
export function setIO(io: SocketServer): void {
  _io = io;
}

export function emitToTenant(tenantId: string, event: string, data: any): void {
  _io?.to(`tenant:${tenantId}`).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: any): void {
  _io?.to(`user:${userId}`).emit(event, data);
}
