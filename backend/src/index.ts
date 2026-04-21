import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from './config';
import { connectDatabase } from './database';
import { runMigrations } from './database/migrate';
import { connectRedis } from './services/redis.service';
import { errorHandler } from './middlewares/error.middleware';
import { setupRoutes } from './routes';
import { setupSocket } from './services/socket.service';

async function bootstrap() {
  const app = express();
  const httpServer = createServer(app);

  // Socket.io
  const io = new SocketServer(httpServer, {
    cors: { origin: config.frontendUrl, credentials: true },
  });

  // Trust proxy (behind Nginx)
  app.set('trust proxy', 1);

  // Middlewares
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: config.frontendUrl, credentials: true }));
  app.use(morgan('combined'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Connect services
  await connectDatabase();
  await runMigrations();
  await connectRedis();
  setupSocket(io);
  setupRoutes(app, io);

  // Error handler (must be last)
  app.use(errorHandler);

  httpServer.listen(Number(config.port), '0.0.0.0', () => {
    console.log(`🚀 CRM Backend running on port ${config.port}`);
    console.log(`   Environment: ${config.nodeEnv}`);
    console.log(`   Database: ${config.databaseUrl.split('@')[1]}`);
  });
}

bootstrap().catch(console.error);
