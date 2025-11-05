import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

const MIGRATION_SQL = `
-- Create blood_pressure_events table
CREATE TABLE IF NOT EXISTS blood_pressure_events (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  senior_number VARCHAR(20) NOT NULL,
  bp_value VARCHAR(10) NOT NULL,
  kid1_status VARCHAR(10) NOT NULL,
  kid2_status VARCHAR(10) NOT NULL,
  kid1_message_id VARCHAR(100),
  kid2_message_id VARCHAR(100),
  error_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bp_events_timestamp ON blood_pressure_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_bp_events_senior ON blood_pressure_events(senior_number);
CREATE INDEX IF NOT EXISTS idx_bp_events_created_at ON blood_pressure_events(created_at DESC);

-- Create subscription_tracking table for throttling
CREATE TABLE IF NOT EXISTS subscription_tracking (
  phone_number VARCHAR(20) PRIMARY KEY,
  last_prompt_time TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on last_prompt_time
CREATE INDEX IF NOT EXISTS idx_subscription_last_prompt ON subscription_tracking(last_prompt_time);
`;

async function migrate() {
  try {
    console.log('🔄 Starting database migration...');

    await pool.query(MIGRATION_SQL);

    console.log('✅ Migration completed successfully!');
    console.log('\nTables created:');
    console.log('  - blood_pressure_events');
    console.log('  - subscription_tracking');
    console.log('\nIndexes created for optimal performance.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
