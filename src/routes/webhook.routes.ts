import { Router, Request, Response } from 'express';
import { config } from '../config/env';
import { logInfo, logError, logWarn } from '../utils/logger';
import { WebhookPayload } from '../types/whatsapp.types';
import { parseWebhookPayload } from '../services/webhook-parser.service';
import { handleBloodPressureSelection } from '../services/blood-pressure.service';
import { whatsappClient } from '../services/whatsapp.service';

const router = Router();

/**
 * GET /webhook
 * WhatsApp webhook verification endpoint
 * Meta will call this to verify the webhook URL
 */
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logInfo('Webhook verification request', {
    mode,
    tokenMatch: token === config.whatsapp.verifyToken,
  });

  // Check if mode and token are correct
  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    logInfo('Webhook verified successfully');
    // Respond with the challenge token from the request
    res.status(200).send(challenge);
  } else {
    logWarn('Webhook verification failed', {
      mode,
      tokenProvided: !!token,
    });
    res.sendStatus(403);
  }
});

/**
 * POST /webhook
 * Receives WhatsApp events (messages, status updates, etc.)
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const payload: WebhookPayload = req.body;

    // Always respond 200 OK immediately to prevent WhatsApp retries
    res.sendStatus(200);

    logInfo('Webhook event received', {
      object: payload.object,
      entries: payload.entry?.length || 0,
    });

    // Verify it's a WhatsApp event
    if (payload.object !== 'whatsapp_business_account') {
      logWarn('Received non-WhatsApp webhook event', { object: payload.object });
      return;
    }

    // Process each entry
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        // Check if there are messages
        if (change.value.messages && change.value.messages.length > 0) {
          for (const message of change.value.messages) {
            // Check if it's an interactive message (button/list selection)
            const parsed = parseWebhookPayload(message);

            if (parsed) {
              logInfo('Parsed button selection', {
                from: parsed.from,
                value: parsed.selectedValue,
              });

              // Handle the blood pressure selection
              await handleBloodPressureSelection(parsed.from, parsed.selectedValue);
            }
            // If it's a text message from the senior, auto-reply with menu
            else if (message.type === 'text' && message.from === config.phoneNumbers.senior) {
              logInfo('Received text message from senior, sending menu', {
                from: message.from,
                text: message.text?.body,
              });

              try {
                // Automatically send the interactive menu
                const messageId = await whatsappClient.sendInteractiveMenu(message.from);
                logInfo('Auto-sent menu to senior', { messageId });
              } catch (error) {
                logError('Failed to auto-send menu', error);
              }
            }
            // Other message types (images, audio, etc.) - just log
            else {
              logWarn('Received non-interactive message', {
                type: message.type,
                from: message.from,
              });
            }
          }
        }

        // Log status updates (optional, for monitoring)
        if (change.value.statuses && change.value.statuses.length > 0) {
          for (const status of change.value.statuses) {
            logInfo('Message status update', {
              messageId: status.id,
              status: status.status,
              recipientId: status.recipient_id,
            });
          }
        }
      }
    }
  } catch (error) {
    logError('Error processing webhook', error);
    // Note: We already sent 200 OK, so we just log the error
  }
});

export default router;
