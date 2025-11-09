import cron from 'node-cron';
import { config } from '../config/env';
import { whatsappClient } from './whatsapp.service';
import { sendDailyReport } from './daily-report.service';
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
    // Production: Every 2 hours from 9 AM to 11 PM
    const cronExpression = '0 9-23/2 * * *';

    logInfo('Initializing 2-hourly menu scheduler', {
      timezone: config.scheduling.timezone,
      cronExpression,
      frequency: 'Every 2 hours from 9 AM to 11 PM',
    });

    // Schedule the 2-hourly menu send
    const menuTask = cron.schedule(
      cronExpression,
      async () => {
        logInfo('Scheduled 2-hourly menu send triggered', {
          time: new Date().toISOString(),
        });

        try {
          const messageId = await whatsappClient.sendRangeSelectionButtons(
            config.phoneNumbers.senior
          );

          logInfo('Scheduled range buttons sent successfully', {
            messageId,
            seniorNumber: config.phoneNumbers.senior,
          });
        } catch (error) {
          logError('Failed to send scheduled range buttons', error);
        }
      },
      {
        timezone: config.scheduling.timezone,
      }
    );

    // Start the menu cron job
    menuTask.start();

    logInfo('2-hourly menu scheduler started successfully', {
      schedule: 'Every 2 hours from 9:00 to 23:00 (9, 11, 13, 15, 17, 19, 21, 23)',
      timezone: config.scheduling.timezone,
    });

    // Daily report schedule: 20:00 (8 PM) every day
    const dailyReportExpression = '0 20 * * *';

    logInfo('Initializing daily report scheduler', {
      timezone: config.scheduling.timezone,
      cronExpression: dailyReportExpression,
      frequency: 'Daily at 20:00 (8 PM)',
    });

    const reportTask = cron.schedule(
      dailyReportExpression,
      async () => {
        logInfo('Scheduled daily report triggered', {
          time: new Date().toISOString(),
        });

        try {
          await sendDailyReport();
          logInfo('Daily report sent successfully');
        } catch (error) {
          logError('Failed to send daily report', error);
        }
      },
      {
        timezone: config.scheduling.timezone,
      }
    );

    // Start the daily report cron job
    reportTask.start();

    logInfo('Daily report scheduler started successfully', {
      schedule: 'Daily at 20:00 (8 PM)',
      timezone: config.scheduling.timezone,
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
    const messageId = await whatsappClient.sendRangeSelectionButtons(config.phoneNumbers.senior);

    logInfo('Manual scheduled send successful', {
      messageId,
      seniorNumber: config.phoneNumbers.senior,
    });
  } catch (error) {
    logError('Failed manual scheduled send', error);
    throw error;
  }
}
