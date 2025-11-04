import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Validate E.164 phone number format (10-15 digits)
function validatePhoneNumber(phone: string, fieldName: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (!/^\d{10,15}$/.test(cleaned)) {
    throw new Error(
      `${fieldName} must be in E.164 format (10-15 digits). Received: ${phone}`
    );
  }
  return cleaned;
}

// Parse boolean environment variable
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

// Parse integer environment variable
function parseInt(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return defaultValue;
  return parsed;
}

// Required environment variables
const requiredEnvVars = [
  'WHATSAPP_TOKEN',
  'PHONE_NUMBER_ID',
  'VERIFY_TOKEN',
  'SENIOR_NUMBER',
  'CAREGIVER1',
  'CAREGIVER2',
  'SEND_MENU_BEARER',
];

// Check for missing required variables
const missing = requiredEnvVars.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(', ')}\n` +
    'Please create a .env file based on .env.example'
  );
}

// Export configuration
export const config = {
  // Server
  port: parseInt(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || 'development',

  // WhatsApp API
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN!,
    phoneNumberId: process.env.PHONE_NUMBER_ID!,
    verifyToken: process.env.VERIFY_TOKEN!,
    apiVersion: 'v18.0',
    baseUrl: 'https://graph.facebook.com',
  },

  // Phone Numbers
  phoneNumbers: {
    senior: validatePhoneNumber(process.env.SENIOR_NUMBER!, 'SENIOR_NUMBER'),
    caregiver1: validatePhoneNumber(process.env.CAREGIVER1!, 'CAREGIVER1'),
    caregiver2: validatePhoneNumber(process.env.CAREGIVER2!, 'CAREGIVER2'),
  },

  // Security
  security: {
    sendMenuBearer: process.env.SEND_MENU_BEARER!,
    enableWebhookSignature: parseBoolean(process.env.ENABLE_WEBHOOK_SIGNATURE, false),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 900000), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10),
  },

  // Scheduling
  scheduling: {
    enabled: parseBoolean(process.env.ENABLE_DAILY_SCHEDULE, false),
    dailySendTime: process.env.DAILY_SEND_TIME || '08:00',
    timezone: process.env.TIMEZONE || 'Europe/Riga',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validate configuration on load
console.log('Configuration loaded successfully');
console.log(`Environment: ${config.nodeEnv}`);
console.log(`Port: ${config.port}`);
console.log(`WhatsApp Phone Number ID: ${config.whatsapp.phoneNumberId}`);
console.log(`Senior Number: ${config.phoneNumbers.senior}`);
console.log(`Daily Schedule: ${config.scheduling.enabled ? 'Enabled' : 'Disabled'}`);
