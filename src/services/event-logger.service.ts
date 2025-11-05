import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs';
import { logInfo, logError } from '../utils/logger';
import { BloodPressureValue } from '../types/whatsapp.types';

export interface EventLogEntry {
  timestamp: string;
  seniorNumber: string;
  value: BloodPressureValue;
  kid1Status: 'sent' | 'failed';
  kid2Status: 'sent' | 'failed';
  kid1MessageId?: string;
  kid2MessageId?: string;
  errors?: {
    kid1?: string;
    kid2?: string;
  };
}

// CSV file path
const dataDir = path.resolve(process.cwd(), 'data');
const csvFilePath = path.join(dataDir, 'events.csv');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  logInfo('Created data directory', { path: dataDir });
}

// CSV Writer configuration
const csvWriter = createObjectCsvWriter({
  path: csvFilePath,
  header: [
    { id: 'timestamp', title: 'Timestamp' },
    { id: 'seniorNumber', title: 'Senior Number' },
    { id: 'value', title: 'Blood Pressure Value' },
    { id: 'kid1Status', title: 'Kid 1 Status' },
    { id: 'kid2Status', title: 'Kid 2 Status' },
    { id: 'kid1MessageId', title: 'Kid 1 Message ID' },
    { id: 'kid2MessageId', title: 'Kid 2 Message ID' },
    { id: 'errorDetails', title: 'Error Details' },
  ],
  append: true, // Append to existing file
});

// Check if CSV file exists and create header if needed
function ensureCsvHeader(): void {
  if (!fs.existsSync(csvFilePath)) {
    logInfo('Creating new CSV file', { path: csvFilePath });
    // Write empty array to create file with header
    csvWriter.writeRecords([]).catch((error) => {
      logError('Failed to create CSV header', error);
    });
  }
}

// Initialize CSV file
ensureCsvHeader();

/**
 * Log a blood pressure selection event to CSV
 */
export async function logSelectionEvent(entry: EventLogEntry): Promise<void> {
  try {
    const record = {
      timestamp: entry.timestamp,
      seniorNumber: entry.seniorNumber,
      value: entry.value,
      kid1Status: entry.kid1Status,
      kid2Status: entry.kid2Status,
      kid1MessageId: entry.kid1MessageId || '',
      kid2MessageId: entry.kid2MessageId || '',
      errorDetails: entry.errors
        ? JSON.stringify({
            kid1: entry.errors.kid1,
            kid2: entry.errors.kid2,
          })
        : '',
    };

    await csvWriter.writeRecords([record]);

    logInfo('Event logged to CSV', {
      value: entry.value,
      kid1Status: entry.kid1Status,
      kid2Status: entry.kid2Status,
    });
  } catch (error) {
    logError('Failed to log event to CSV', error);
    // Don't throw - logging failure shouldn't break the main flow
  }
}

/**
 * Get recent events from CSV (for future dashboard/monitoring)
 */
export async function getRecentEvents(limit: number = 100): Promise<any[]> {
  try {
    if (!fs.existsSync(csvFilePath)) {
      return [];
    }

    const content = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = content.trim().split('\n');

    if (lines.length <= 1) {
      // Only header or empty
      return [];
    }

    // Get last N lines (excluding header)
    const dataLines = lines.slice(1); // Skip header
    const recentLines = dataLines.slice(-limit);

    // Parse CSV lines (simple parsing, assumes no commas in values)
    const events = recentLines.map((line) => {
      const parts = line.split(',');
      return {
        timestamp: parts[0],
        seniorNumber: parts[1],
        value: parts[2],
        kid1Status: parts[3],
        kid2Status: parts[4],
        kid1MessageId: parts[5],
        kid2MessageId: parts[6],
        errorDetails: parts[7],
      };
    });

    return events;
  } catch (error) {
    logError('Failed to read events from CSV', error);
    return [];
  }
}

/**
 * Get statistics from logged events
 */
export async function getStatistics(): Promise<{
  totalEvents: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  averageBP: number;
  highBPCount: number;
}> {
  try {
    const events = await getRecentEvents(1000); // Last 1000 events

    const totalEvents = events.length;
    const successfulDeliveries = events.filter(
      (e) => e.kid1Status === 'sent' && e.kid2Status === 'sent'
    ).length;
    const failedDeliveries = totalEvents - successfulDeliveries;
    const successRate = totalEvents > 0 ? (successfulDeliveries / totalEvents) * 100 : 0;

    // Calculate average BP and high BP count
    let totalBP = 0;
    let countableEvents = 0;
    let highBPCount = 0;

    events.forEach((e) => {
      const value = e.value;
      if (value === '<110') {
        totalBP += 105; // Use 105 as representative value
        countableEvents++;
      } else if (value === '>160') {
        totalBP += 165; // Use 165 as representative value
        countableEvents++;
        highBPCount++;
      } else {
        // It's a numeric value like '120', '130', etc.
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue)) {
          totalBP += numValue;
          countableEvents++;
        }
      }
    });

    const averageBP = countableEvents > 0 ? Math.round(totalBP / countableEvents) : 0;

    return {
      totalEvents,
      successfulDeliveries,
      failedDeliveries,
      successRate: Math.round(successRate * 100) / 100,
      averageBP,
      highBPCount,
    };
  } catch (error) {
    logError('Failed to calculate statistics', error);
    return {
      totalEvents: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      successRate: 0,
      averageBP: 0,
      highBPCount: 0,
    };
  }
}
