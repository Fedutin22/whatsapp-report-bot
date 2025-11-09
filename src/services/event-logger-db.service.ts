import { query, isDatabaseAvailable } from '../database/db.service';
import { logInfo, logError } from '../utils/logger';
import { BloodPressureValue } from '../types/whatsapp.types';

export interface DBEventLogEntry {
  id?: number;
  timestamp: Date;
  seniorNumber: string;
  bpValue: BloodPressureValue;
  kid1Status: 'sent' | 'failed';
  kid2Status: 'sent' | 'failed';
  kid1MessageId?: string;
  kid2MessageId?: string;
  errorDetails?: {
    kid1?: string;
    kid2?: string;
  };
}

/**
 * Log a blood pressure event to PostgreSQL database
 */
export async function logEventToDatabase(entry: DBEventLogEntry): Promise<boolean> {
  if (!isDatabaseAvailable()) {
    logInfo('Database not available, skipping DB log');
    return false;
  }

  try {
    const result = await query(
      `INSERT INTO blood_pressure_events
       (timestamp, senior_number, bp_value, kid1_status, kid2_status, kid1_message_id, kid2_message_id, error_details)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        entry.timestamp,
        entry.seniorNumber,
        entry.bpValue,
        entry.kid1Status,
        entry.kid2Status,
        entry.kid1MessageId || null,
        entry.kid2MessageId || null,
        entry.errorDetails ? JSON.stringify(entry.errorDetails) : null,
      ]
    );

    if (result && result.rows.length > 0) {
      logInfo('Event logged to database', {
        id: result.rows[0].id,
        value: entry.bpValue,
      });
      return true;
    }

    return false;
  } catch (error) {
    logError('Failed to log event to database', error);
    return false;
  }
}

/**
 * Get recent events from database
 */
export async function getRecentEventsFromDB(limit: number = 100): Promise<any[]> {
  if (!isDatabaseAvailable()) {
    return [];
  }

  try {
    const result = await query(
      `SELECT
        id,
        timestamp,
        senior_number as "seniorNumber",
        bp_value as "value",
        kid1_status as "kid1Status",
        kid2_status as "kid2Status",
        kid1_message_id as "kid1MessageId",
        kid2_message_id as "kid2MessageId",
        error_details as "errorDetails"
       FROM blood_pressure_events
       ORDER BY timestamp DESC
       LIMIT $1`,
      [limit]
    );

    return result ? result.rows : [];
  } catch (error) {
    logError('Failed to get events from database', error);
    return [];
  }
}

/**
 * Get statistics from database
 */
export async function getStatisticsFromDB(): Promise<{
  totalEvents: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  averageBP: number;
  highBPCount: number;
} | null> {
  if (!isDatabaseAvailable()) {
    return null;
  }

  try {
    // Get total events and success counts
    const statsResult = await query(`
      SELECT
        COUNT(*) as total_events,
        COUNT(*) FILTER (WHERE kid1_status = 'sent' AND kid2_status = 'sent') as successful,
        COUNT(*) FILTER (WHERE bp_value = '>145' OR bp_value = '>160') as high_bp_count
      FROM blood_pressure_events
      WHERE timestamp > NOW() - INTERVAL '30 days'
    `);

    if (!statsResult || statsResult.rows.length === 0) {
      return null;
    }

    const stats = statsResult.rows[0];
    const totalEvents = parseInt(stats.total_events);
    const successful = parseInt(stats.successful);
    const highBPCount = parseInt(stats.high_bp_count);
    const failedDeliveries = totalEvents - successful;
    const successRate = totalEvents > 0 ? (successful / totalEvents) * 100 : 0;

    // Calculate average BP
    const bpResult = await query(`
      SELECT bp_value
      FROM blood_pressure_events
      WHERE timestamp > NOW() - INTERVAL '30 days'
    `);

    let totalBP = 0;
    let countableEvents = 0;

    if (bpResult && bpResult.rows.length > 0) {
      bpResult.rows.forEach((row) => {
        const value = row.bp_value;
        // Handle low BP values
        if (value === '<80') {
          totalBP += 75;
          countableEvents++;
        } else if (value === '<115' || value === '<110') {
          totalBP += 110;
          countableEvents++;
        }
        // Handle high BP values
        else if (value === '>145') {
          totalBP += 150;
          countableEvents++;
        } else if (value === '>160') {
          totalBP += 165;
          countableEvents++;
        }
        // Handle numeric values
        else {
          const numValue = parseInt(value, 10);
          if (!isNaN(numValue)) {
            totalBP += numValue;
            countableEvents++;
          }
        }
      });
    }

    const averageBP = countableEvents > 0 ? Math.round(totalBP / countableEvents) : 0;

    return {
      totalEvents,
      successfulDeliveries: successful,
      failedDeliveries,
      successRate: Math.round(successRate * 100) / 100,
      averageBP,
      highBPCount,
    };
  } catch (error) {
    logError('Failed to get statistics from database', error);
    return null;
  }
}
