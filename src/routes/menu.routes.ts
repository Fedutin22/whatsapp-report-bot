import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { whatsappClient } from '../services/whatsapp.service';
import { config } from '../config/env';
import { requireBearerAuth } from '../middleware/auth.middleware';
import { logInfo, logError } from '../utils/logger';

const router = Router();

// Rate limiter for send-menu endpoint
const sendMenuLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too Many Requests',
    message: 'You have exceeded the rate limit. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * GET /send-menu
 * Sends the interactive blood pressure menu to the senior
 * Requires Bearer token authentication and rate limiting
 */
router.get('/send-menu', sendMenuLimiter, requireBearerAuth, async (req: Request, res: Response) => {
  try {
    logInfo('Sending menu to senior', {
      seniorNumber: config.phoneNumbers.senior,
      triggeredBy: req.ip,
    });

    const messageId = await whatsappClient.sendInteractiveMenu(config.phoneNumbers.senior);

    res.status(200).json({
      success: true,
      messageId,
      to: config.phoneNumbers.senior,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logError('Failed to send menu', error);

    res.status(500).json({
      success: false,
      error: 'Failed to send menu',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
