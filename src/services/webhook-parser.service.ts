import { BLOOD_PRESSURE_BUTTON_MAP, BloodPressureValue } from '../types/whatsapp.types';
import { logDebug, logWarn } from '../utils/logger';

export interface ParsedButtonSelection {
  from: string;
  selectedValue: BloodPressureValue;
  timestamp: string;
  messageId: string;
}

/**
 * Parse webhook message to extract button/list selection
 * Returns null if message is not an interactive selection
 */
export function parseWebhookPayload(message: any): ParsedButtonSelection | null {
  // Check if it's an interactive message
  if (message.type !== 'interactive') {
    return null;
  }

  const interactive = message.interactive;
  if (!interactive) {
    return null;
  }

  let buttonId: string | null = null;

  // Check for list reply (our primary method)
  if (interactive.type === 'list_reply' && interactive.list_reply) {
    buttonId = interactive.list_reply.id;
    logDebug('Parsed list reply', {
      id: buttonId,
      title: interactive.list_reply.title,
    });
  }
  // Check for button reply (fallback)
  else if (interactive.type === 'button_reply' && interactive.button_reply) {
    buttonId = interactive.button_reply.id;
    logDebug('Parsed button reply', {
      id: buttonId,
      title: interactive.button_reply.title,
    });
  }

  if (!buttonId) {
    logWarn('Interactive message without recognized reply type', { interactive });
    return null;
  }

  // Map button ID to blood pressure value
  const selectedValue = BLOOD_PRESSURE_BUTTON_MAP[buttonId];

  if (!selectedValue) {
    logWarn('Unknown button ID', { buttonId });
    return null;
  }

  return {
    from: message.from,
    selectedValue,
    timestamp: message.timestamp,
    messageId: message.id,
  };
}
