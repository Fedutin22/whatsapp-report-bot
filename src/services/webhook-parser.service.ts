import { BLOOD_PRESSURE_BUTTON_MAP, BloodPressureValue } from '../types/whatsapp.types';
import { logDebug, logWarn } from '../utils/logger';

export interface ParsedButtonSelection {
  from: string;
  selectedValue: BloodPressureValue;
  timestamp: string;
  messageId: string;
}

export interface ParsedSubscription {
  from: string;
  timestamp: string;
  messageId: string;
}

export interface ParsedRangeSelection {
  from: string;
  range: 'low' | 'high';
  timestamp: string;
  messageId: string;
}

export type ParsedWebhookMessage =
  | { type: 'bp_selection'; data: ParsedButtonSelection }
  | { type: 'subscription'; data: ParsedSubscription }
  | { type: 'range_selection'; data: ParsedRangeSelection }
  | null;

/**
 * Parse webhook message to extract button/list selection
 * Returns null if message is not an interactive selection
 */
export function parseWebhookPayload(message: any): ParsedWebhookMessage {
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

  // Check if it's a range selection (low vs high)
  if (buttonId === 'range_low' || buttonId === 'range_high') {
    return {
      type: 'range_selection',
      data: {
        from: message.from,
        range: buttonId === 'range_low' ? 'low' : 'high',
        timestamp: message.timestamp,
        messageId: message.id,
      },
    };
  }

  // Check if it's a subscription response
  if (buttonId === 'subscribe_yes') {
    return {
      type: 'subscription',
      data: {
        from: message.from,
        timestamp: message.timestamp,
        messageId: message.id,
      },
    };
  }

  // Map button ID to blood pressure value
  const selectedValue = BLOOD_PRESSURE_BUTTON_MAP[buttonId];

  if (!selectedValue) {
    logWarn('Unknown button ID', { buttonId });
    return null;
  }

  return {
    type: 'bp_selection',
    data: {
      from: message.from,
      selectedValue,
      timestamp: message.timestamp,
      messageId: message.id,
    },
  };
}
