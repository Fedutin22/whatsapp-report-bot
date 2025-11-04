import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { config } from './config/env';
import { logInfo, logError } from './utils/logger';
import menuRoutes from './routes/menu.routes';
import webhookRoutes from './routes/webhook.routes';
import { initializeScheduler } from './services/scheduler.service';

// Create Express app
const app = express();

// Security middleware
app.use(helmet());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logInfo(`${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// Routes
app.use('/', menuRoutes);
app.use('/', webhookRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logError('Unhandled error', err);

  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'Something went wrong',
  });
});

// Start server
const server = app.listen(config.port, () => {
  logInfo(`Server started successfully`, {
    port: config.port,
    environment: config.nodeEnv,
    phoneNumberId: config.whatsapp.phoneNumberId,
  });

  // Initialize scheduler if enabled
  try {
    initializeScheduler();
  } catch (error) {
    logError('Failed to initialize scheduler', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logInfo('SIGTERM received, closing server gracefully');
  server.close(() => {
    logInfo('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logInfo('SIGINT received, closing server gracefully');
  server.close(() => {
    logInfo('Server closed');
    process.exit(0);
  });
});

export default app;
