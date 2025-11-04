import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs';
import { logInfo, logError } from '../utils/logger';
import { BloodPressureValue } from '../types/whatsapp.types';

export interface EventLogEntry {
  timestamp: string;
  seniorNumber: string;
  value: BloodPressureValue;
  caregiver1Status: 'sent' | 'failed';
  caregiver2Status: 'sent' | 'failed';
  caregiver1MessageId?: string;
  caregiver2MessageId?: string;
  errors?: {
    caregiver1?: string;
    caregiver2?: string;
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
    { id: 'caregiver1Status', title: 'Caregiver 1 Status' },
    { id: 'caregiver2Status', title: 'Caregiver 2 Status' },
    { id: 'caregiver1MessageId', title: 'Caregiver 1 Message ID' },
    { id: 'caregiver2MessageId', title: 'Caregiver 2 Message ID' },
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
      caregiver1Status: entry.caregiver1Status,
      caregiver2Status: entry.caregiver2Status,
      caregiver1MessageId: entry.caregiver1MessageId || '',
      caregiver2MessageId: entry.caregiver2MessageId || '',
      errorDetails: entry.errors
        ? JSON.stringify({
            cg1: entry.errors.caregiver1,
            cg2: entry.errors.caregiver2,
          })
        : '',
    };

    await csvWriter.writeRecords([record]);

    logInfo('Event logged to CSV', {
      value: entry.value,
      cg1Status: entry.caregiver1Status,
      cg2Status: entry.caregiver2Status,
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
        caregiver1Status: parts[3],
        caregiver2Status: parts[4],
        caregiver1MessageId: parts[5],
        caregiver2MessageId: parts[6],
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
}> {
  try {
    const events = await getRecentEvents(1000); // Last 1000 events

    const totalEvents = events.length;
    const successfulDeliveries = events.filter(
      (e) => e.caregiver1Status === 'sent' && e.caregiver2Status === 'sent'
    ).length;
    const failedDeliveries = totalEvents - successfulDeliveries;
    const successRate = totalEvents > 0 ? (successfulDeliveries / totalEvents) * 100 : 0;

    return {
      totalEvents,
      successfulDeliveries,
      failedDeliveries,
      successRate: Math.round(successRate * 100) / 100,
    };
  } catch (error) {
    logError('Failed to calculate statistics', error);
    return {
      totalEvents: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      successRate: 0,
    };
  }
}
