import { logInfo } from '../utils/logger';

/**
 * Simple in-memory tracker for subscription prompt timing
 * Prevents spamming kids with subscription prompts
 */

interface SubscriptionRecord {
  lastPromptTime: number; // Unix timestamp in milliseconds
}

// In-memory store - resets on app restart (which is fine)
const subscriptionCache = new Map<string, SubscriptionRecord>();

// How often to send subscription prompts (12 hours = twice per day)
const PROMPT_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

/**
 * Check if we should send a subscription prompt to this phone number
 * Returns true if it's been more than 12 hours since last prompt
 */
export function shouldSendSubscriptionPrompt(phoneNumber: string): boolean {
  const now = Date.now();
  const record = subscriptionCache.get(phoneNumber);

  if (!record) {
    // Never sent before - should send
    return true;
  }

  const timeSinceLastPrompt = now - record.lastPromptTime;
  const shouldSend = timeSinceLastPrompt >= PROMPT_INTERVAL_MS;

  if (shouldSend) {
    logInfo('Subscription prompt interval elapsed', {
      phoneNumber: phoneNumber.substring(0, 5) + '***', // Partially hide number
      hoursSinceLastPrompt: Math.floor(timeSinceLastPrompt / (60 * 60 * 1000)),
    });
  }

  return shouldSend;
}

/**
 * Record that we sent a subscription prompt to this phone number
 */
export function markSubscriptionPromptSent(phoneNumber: string): void {
  subscriptionCache.set(phoneNumber, {
    lastPromptTime: Date.now(),
  });

  logInfo('Subscription prompt sent and recorded', {
    phoneNumber: phoneNumber.substring(0, 5) + '***',
    nextPromptIn: '12 hours',
  });
}

/**
 * Get time until next prompt allowed (for logging/debugging)
 */
export function getTimeUntilNextPrompt(phoneNumber: string): number {
  const record = subscriptionCache.get(phoneNumber);

  if (!record) {
    return 0; // Can send now
  }

  const now = Date.now();
  const timeSinceLastPrompt = now - record.lastPromptTime;
  const timeRemaining = PROMPT_INTERVAL_MS - timeSinceLastPrompt;

  return Math.max(0, timeRemaining);
}
