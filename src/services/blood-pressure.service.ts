import { whatsappClient } from './whatsapp.service';
import { config } from '../config/env';
import { logInfo, logError, logWarn } from '../utils/logger';
import { BloodPressureValue } from '../types/whatsapp.types';
import { logSelectionEvent } from './event-logger.service';
import {
  shouldSendSubscriptionPrompt,
  markSubscriptionPromptSent,
} from './subscription-tracker.service';

export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BloodPressureHandlerResult {
  seniorConfirmation: DeliveryResult;
  kid1Notification: DeliveryResult;
  kid2Notification: DeliveryResult;
}

/**
 * Handle blood pressure selection from senior
 * Sends confirmation to senior and notifications to both kids
 */
export async function handleBloodPressureSelection(
  from: string,
  value: BloodPressureValue
): Promise<BloodPressureHandlerResult> {
  logInfo('Processing blood pressure selection', { from, value });

  // Validate sender is the senior
  if (from !== config.phoneNumbers.senior) {
    logWarn('Blood pressure selection from non-senior number', {
      from,
      expected: config.phoneNumbers.senior,
    });
    // We still process it but log the warning
  }

  const result: BloodPressureHandlerResult = {
    seniorConfirmation: { success: false },
    kid1Notification: { success: false },
    kid2Notification: { success: false },
  };

  // Send messages to all recipients in parallel using Promise.allSettled
  // This ensures one failure doesn't block others
  const [seniorResult, kid1Result, kid2Result] = await Promise.allSettled([
    whatsappClient.sendConfirmation(from, value),
    whatsappClient.sendBloodPressureNotification(config.phoneNumbers.kid1, value),
    whatsappClient.sendBloodPressureNotification(config.phoneNumbers.kid2, value),
  ]);

  // Process senior confirmation result
  if (seniorResult.status === 'fulfilled') {
    result.seniorConfirmation = {
      success: true,
      messageId: seniorResult.value,
    };
    logInfo('Senior confirmation sent', { messageId: seniorResult.value });
  } else {
    result.seniorConfirmation = {
      success: false,
      error: seniorResult.reason?.message || 'Unknown error',
    };
    logError('Failed to send senior confirmation', seniorResult.reason);
  }

  // Process kid 1 result
  if (kid1Result.status === 'fulfilled') {
    result.kid1Notification = {
      success: true,
      messageId: kid1Result.value,
    };
    logInfo('Kid 1 notification sent', { messageId: kid1Result.value });
  } else {
    result.kid1Notification = {
      success: false,
      error: kid1Result.reason?.message || 'Unknown error',
    };
    logError('Failed to send kid 1 notification', kid1Result.reason);
  }

  // Process kid 2 result
  if (kid2Result.status === 'fulfilled') {
    result.kid2Notification = {
      success: true,
      messageId: kid2Result.value,
    };
    logInfo('Kid 2 notification sent', { messageId: kid2Result.value });
  } else {
    result.kid2Notification = {
      success: false,
      error: kid2Result.reason?.message || 'Unknown error',
    };
    logError('Failed to send kid 2 notification', kid2Result.reason);
  }

  // Log the event to CSV
  await logSelectionEvent({
    timestamp: new Date().toISOString(),
    seniorNumber: from,
    value,
    kid1Status: result.kid1Notification.success ? 'sent' : 'failed',
    kid2Status: result.kid2Notification.success ? 'sent' : 'failed',
    kid1MessageId: result.kid1Notification.messageId,
    kid2MessageId: result.kid2Notification.messageId,
    errors: {
      kid1: result.kid1Notification.error,
      kid2: result.kid2Notification.error,
    },
  });

  // If both kids failed, send error message to senior
  if (!result.kid1Notification.success && !result.kid2Notification.success) {
    logError('Both kids failed, sending error message to senior');
    try {
      await whatsappClient.sendErrorMessage(from);
    } catch (error) {
      logError('Failed to send error message to senior', error);
    }
  } else {
    // If at least one kid received the notification successfully,
    // send subscription prompts (but only if enough time has passed - max twice per day)

    if (result.kid1Notification.success && shouldSendSubscriptionPrompt(config.phoneNumbers.kid1)) {
      whatsappClient
        .sendSubscriptionPrompt(config.phoneNumbers.kid1)
        .then(() => {
          markSubscriptionPromptSent(config.phoneNumbers.kid1);
        })
        .catch((error) => {
          logError('Failed to send subscription prompt to kid 1', error);
        });
    }

    if (result.kid2Notification.success && shouldSendSubscriptionPrompt(config.phoneNumbers.kid2)) {
      whatsappClient
        .sendSubscriptionPrompt(config.phoneNumbers.kid2)
        .then(() => {
          markSubscriptionPromptSent(config.phoneNumbers.kid2);
        })
        .catch((error) => {
          logError('Failed to send subscription prompt to kid 2', error);
        });
    }
  }

  return result;
}
