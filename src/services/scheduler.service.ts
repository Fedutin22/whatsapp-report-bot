import cron from 'node-cron';
import { config } from '../config/env';
import { whatsappClient } from './whatsapp.service';
import { logInfo, logError } from '../utils/logger';

/**
 * Parse time string (HH:MM) to cron expression
 * Example: "08:00" -> "0 8 * * *"
 */
function timeToCronExpression(time: string): string {
  const [hours, minutes] = time.split(':').map((n) => parseInt(n, 10));

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time format: ${time}. Expected HH:MM (24-hour format)`);
  }

  return `${minutes} ${hours} * * *`;
}

/**
 * Initialize daily menu scheduler if enabled
 */
export function initializeScheduler(): void {
  if (!config.scheduling.enabled) {
    logInfo('Daily scheduler is disabled');
    return;
  }

  try {
    const cronExpression = timeToCronExpression(config.scheduling.dailySendTime);

    logInfo('Initializing daily menu scheduler', {
      time: config.scheduling.dailySendTime,
      timezone: config.scheduling.timezone,
      cronExpression,
    });

    // Schedule the daily menu send
    const task = cron.schedule(
      cronExpression,
      async () => {
        logInfo('Scheduled daily menu send triggered', {
          time: new Date().toISOString(),
        });

        try {
          const messageId = await whatsappClient.sendInteractiveMenu(
            config.phoneNumbers.senior
          );

          logInfo('Scheduled menu sent successfully', {
            messageId,
            seniorNumber: config.phoneNumbers.senior,
          });
        } catch (error) {
          logError('Failed to send scheduled menu', error);
        }
      },
      {
        timezone: config.scheduling.timezone,
      }
    );

    // Start the cron job
    task.start();

    logInfo('Daily menu scheduler started successfully', {
      nextRun: 'Daily at ' + config.scheduling.dailySendTime,
    });
  } catch (error) {
    logError('Failed to initialize scheduler', error);
    throw error;
  }
}

/**
 * Manual trigger for testing the scheduler
 */
export async function triggerScheduledSend(): Promise<void> {
  logInfo('Manual trigger of scheduled send');

  try {
    const messageId = await whatsappClient.sendInteractiveMenu(config.phoneNumbers.senior);

    logInfo('Manual scheduled send successful', {
      messageId,
      seniorNumber: config.phoneNumbers.senior,
    });
  } catch (error) {
    logError('Failed manual scheduled send', error);
    throw error;
  }
}
