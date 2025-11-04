import { whatsappClient } from './whatsapp.service';
import { config } from '../config/env';
import { logInfo, logError, logWarn } from '../utils/logger';
import { BloodPressureValue } from '../types/whatsapp.types';
import { logSelectionEvent } from './event-logger.service';

export interface DeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BloodPressureHandlerResult {
  seniorConfirmation: DeliveryResult;
  caregiver1Notification: DeliveryResult;
  caregiver2Notification: DeliveryResult;
}

/**
 * Handle blood pressure selection from senior
 * Sends confirmation to senior and notifications to both caregivers
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
    caregiver1Notification: { success: false },
    caregiver2Notification: { success: false },
  };

  // Send messages to all recipients in parallel using Promise.allSettled
  // This ensures one failure doesn't block others
  const [seniorResult, caregiver1Result, caregiver2Result] = await Promise.allSettled([
    whatsappClient.sendConfirmation(from, value),
    whatsappClient.sendBloodPressureNotification(config.phoneNumbers.caregiver1, value),
    whatsappClient.sendBloodPressureNotification(config.phoneNumbers.caregiver2, value),
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

  // Process caregiver 1 result
  if (caregiver1Result.status === 'fulfilled') {
    result.caregiver1Notification = {
      success: true,
      messageId: caregiver1Result.value,
    };
    logInfo('Caregiver 1 notification sent', { messageId: caregiver1Result.value });
  } else {
    result.caregiver1Notification = {
      success: false,
      error: caregiver1Result.reason?.message || 'Unknown error',
    };
    logError('Failed to send caregiver 1 notification', caregiver1Result.reason);
  }

  // Process caregiver 2 result
  if (caregiver2Result.status === 'fulfilled') {
    result.caregiver2Notification = {
      success: true,
      messageId: caregiver2Result.value,
    };
    logInfo('Caregiver 2 notification sent', { messageId: caregiver2Result.value });
  } else {
    result.caregiver2Notification = {
      success: false,
      error: caregiver2Result.reason?.message || 'Unknown error',
    };
    logError('Failed to send caregiver 2 notification', caregiver2Result.reason);
  }

  // Log the event to CSV
  await logSelectionEvent({
    timestamp: new Date().toISOString(),
    seniorNumber: from,
    value,
    caregiver1Status: result.caregiver1Notification.success ? 'sent' : 'failed',
    caregiver2Status: result.caregiver2Notification.success ? 'sent' : 'failed',
    caregiver1MessageId: result.caregiver1Notification.messageId,
    caregiver2MessageId: result.caregiver2Notification.messageId,
    errors: {
      caregiver1: result.caregiver1Notification.error,
      caregiver2: result.caregiver2Notification.error,
    },
  });

  // If both caregivers failed, send error message to senior
  if (!result.caregiver1Notification.success && !result.caregiver2Notification.success) {
    logError('Both caregivers failed, sending error message to senior');
    try {
      await whatsappClient.sendErrorMessage(from);
    } catch (error) {
      logError('Failed to send error message to senior', error);
    }
  }

  return result;
}
