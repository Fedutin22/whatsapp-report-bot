import cron from 'node-cron';
import { config } from '../config/env';
import { whatsappClient } from './whatsapp.service';
import { logInfo, logError } from '../utils/logger';

/**
 * Initialize menu scheduler if enabled
 */
export function initializeScheduler(): void {
  if (!config.scheduling.enabled) {
    logInfo('Scheduler is disabled');
    return;
  }

  try {
    // Hourly schedule: every hour from 9 AM to 11 PM (23:00)
    const cronExpression = '0 9-23 * * *';

    logInfo('Initializing hourly menu scheduler', {
      timezone: config.scheduling.timezone,
      cronExpression,
      frequency: 'Every hour from 9 AM to 11 PM',
    });

    // Schedule the hourly menu send
    const task = cron.schedule(
      cronExpression,
      async () => {
        logInfo('Scheduled hourly menu send triggered', {
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

    logInfo('Hourly menu scheduler started successfully', {
      schedule: 'Every hour from 9:00 to 23:00 (Europe/Riga)',
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
