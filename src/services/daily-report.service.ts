import { query, isDatabaseAvailable } from '../database/db.service';
import { logInfo, logError } from '../utils/logger';
import { whatsappClient } from './whatsapp.service';
import { config } from '../config/env';

export interface DailyAverages {
  date: string;
  avgBP: number;
  count: number;
}

/**
 * Calculate BP value from string
 */
function calculateBPValue(value: string): number {
  // Handle low blood pressure values
  if (value === '<80') return 75;
  if (value === '<115') return 110; // Keep for backward compatibility with old data

  // Handle high blood pressure values
  if (value === '>145') return 150;
  if (value === '>160') return 165; // Keep for backward compatibility with old data

  // Parse numeric values
  const numValue = parseInt(value, 10);
  return isNaN(numValue) ? 0 : numValue;
}

/**
 * Get daily averages for the last N days
 */
export async function getDailyAverages(days: number = 7): Promise<DailyAverages[]> {
  if (!isDatabaseAvailable()) {
    logInfo('Database not available, cannot generate report');
    return [];
  }

  try {
    const result = await query(
      `SELECT
        DATE(timestamp) as date,
        COUNT(*) as count,
        ARRAY_AGG(bp_value) as bp_values
       FROM blood_pressure_events
       WHERE timestamp > NOW() - INTERVAL '${days} days'
       GROUP BY DATE(timestamp)
       ORDER BY date DESC`,
      []
    );

    if (!result || result.rows.length === 0) {
      return [];
    }

    const dailyAverages: DailyAverages[] = result.rows.map((row) => {
      const bpValues: string[] = row.bp_values;
      let totalBP = 0;
      let validCount = 0;

      bpValues.forEach((value) => {
        const numValue = calculateBPValue(value);
        if (numValue > 0) {
          totalBP += numValue;
          validCount++;
        }
      });

      const avgBP = validCount > 0 ? Math.round(totalBP / validCount) : 0;

      return {
        date: new Date(row.date).toISOString().split('T')[0],
        avgBP,
        count: parseInt(row.count),
      };
    });

    return dailyAverages;
  } catch (error) {
    logError('Failed to get daily averages', error);
    return [];
  }
}

/**
 * Format and send daily report to all recipients
 */
export async function sendDailyReport(): Promise<void> {
  logInfo('Generating daily blood pressure report');

  try {
    const dailyAverages = await getDailyAverages(7);

    if (dailyAverages.length === 0) {
      logInfo('No data available for daily report');
      return;
    }

    // Today's data is the first item
    const today = dailyAverages[0];
    const previousDays = dailyAverages.slice(1);

    // Format report message
    let report = `Ежедневный отчет по давлению:\n\n`;
    report += `Сегодня (${today.date}):\n`;
    report += `  Среднее: ${today.avgBP} mmHg\n`;
    report += `  Измерений: ${today.count}\n\n`;

    if (previousDays.length > 0) {
      report += `Предыдущие дни:\n`;
      previousDays.forEach((day) => {
        report += `  ${day.date}: ${day.avgBP} mmHg (${day.count} изм.)\n`;
      });
    }

    // Calculate 7-day average
    const totalBP = dailyAverages.reduce((sum, day) => sum + day.avgBP * day.count, 0);
    const totalCount = dailyAverages.reduce((sum, day) => sum + day.count, 0);
    const weekAverage = totalCount > 0 ? Math.round(totalBP / totalCount) : 0;

    report += `\n7-дневное среднее: ${weekAverage} mmHg`;

    // Send to all recipients
    const recipients = [
      { number: config.phoneNumbers.senior, name: 'Senior' },
      { number: config.phoneNumbers.kid1, name: 'Kid1' },
      { number: config.phoneNumbers.kid2, name: 'Kid2' },
    ];

    await Promise.allSettled(
      recipients.map(async (recipient) => {
        try {
          const messageId = await whatsappClient.sendTextMessage(recipient.number, report);
          logInfo(`Daily report sent to ${recipient.name}`, { messageId });
        } catch (error) {
          logError(`Failed to send daily report to ${recipient.name}`, error);
        }
      })
    );

    logInfo('Daily report sending completed');
  } catch (error) {
    logError('Failed to generate daily report', error);
  }
}
