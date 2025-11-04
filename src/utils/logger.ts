import pino from 'pino';
import { config } from '../config/env';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.resolve(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create logger instance
export const logger = pino({
  level: config.logging.level,
  transport:
    config.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  // In production, write to files
  ...(config.nodeEnv === 'production' && {
    timestamp: pino.stdTimeFunctions.isoTime,
  }),
});

// Create file loggers for production
export const fileLogger =
  config.nodeEnv === 'production'
    ? pino(
        pino.destination({
          dest: path.join(logsDir, 'app.log'),
          sync: false,
        })
      )
    : logger;

export const errorLogger =
  config.nodeEnv === 'production'
    ? pino(
        pino.destination({
          dest: path.join(logsDir, 'error.log'),
          sync: false,
        })
      )
    : logger;

// Helper functions
export const logInfo = (message: string, data?: any) => {
  logger.info(data || {}, message);
};

export const logError = (message: string, error?: any) => {
  const errorData = error instanceof Error ? {
    message: error.message,
    stack: error.stack,
    name: error.name,
  } : error;

  logger.error(errorData || {}, message);
  if (config.nodeEnv === 'production') {
    errorLogger.error(errorData || {}, message);
  }
};

export const logWarn = (message: string, data?: any) => {
  logger.warn(data || {}, message);
};

export const logDebug = (message: string, data?: any) => {
  logger.debug(data || {}, message);
};
