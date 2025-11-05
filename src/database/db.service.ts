import { Pool, QueryResult, QueryResultRow } from 'pg';
import { logInfo, logError } from '../utils/logger';
import { runMigrations } from './auto-migrate';

// Database connection pool
let pool: Pool | null = null;

/**
 * Initialize database connection pool and run migrations
 */
export async function initializeDatabase(databaseUrl?: string): Promise<void> {
  if (pool) {
    return; // Already initialized
  }

  const connectionString = databaseUrl || process.env.DATABASE_URL;

  if (!connectionString) {
    logError('DATABASE_URL not provided - database features disabled');
    return;
  }

  try {
    // Run migrations first
    const migrationSuccess = await runMigrations(connectionString);
    if (!migrationSuccess) {
      logError('Migrations failed, but continuing with app startup');
    }

    // Create connection pool
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      max: 10, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test connection
    pool.query('SELECT NOW()', (err, result) => {
      if (err) {
        logError('Failed to connect to database', err);
        pool = null;
      } else {
        logInfo('Database connected successfully', {
          timestamp: result.rows[0].now,
        });
      }
    });

    // Handle pool errors
    pool.on('error', (err) => {
      logError('Unexpected database pool error', err);
    });
  } catch (error) {
    logError('Failed to initialize database pool', error);
    pool = null;
  }
}

/**
 * Get database pool instance
 */
export function getPool(): Pool | null {
  return pool;
}

/**
 * Check if database is available
 */
export function isDatabaseAvailable(): boolean {
  return pool !== null;
}

/**
 * Execute a query with error handling
 */
export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T> | null> {
  if (!pool) {
    logError('Database query attempted but pool not initialized');
    return null;
  }

  try {
    const result = await pool.query<T>(text, params);
    return result;
  } catch (error) {
    logError('Database query error', { error, query: text });
    return null;
  }
}

/**
 * Close database connection pool
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logInfo('Database connection pool closed');
  }
}
