import { initializeDatabase, query, closeDatabase, isDatabaseAvailable } from './db.service';
import { logInfo, logError } from '../utils/logger';

/**
 * Delete all blood pressure events from November 5th, 2025 (testing data)
 */
async function deleteTestData() {
  console.log('🗑️  Starting deletion of test data from 05.11.2025...\n');

  try {
    // Initialize database connection
    await initializeDatabase();

    if (!isDatabaseAvailable()) {
      console.error('❌ Database not available. Cannot delete data.');
      process.exit(1);
    }

    // First, show what will be deleted
    console.log('📋 Checking for records from November 5th, 2025...\n');

    const checkResult = await query(
      `SELECT
        id,
        timestamp,
        bp_value,
        kid1_status,
        kid2_status
       FROM blood_pressure_events
       WHERE DATE(timestamp) = '2025-11-05'
       ORDER BY timestamp`
    );

    if (!checkResult || checkResult.rows.length === 0) {
      console.log('✅ No records found for November 5th, 2025. Nothing to delete.');
      await closeDatabase();
      process.exit(0);
    }

    console.log(`Found ${checkResult.rows.length} record(s) to delete:\n`);
    checkResult.rows.forEach((row, index) => {
      const timestamp = new Date(row.timestamp).toLocaleString('ru-RU');
      console.log(`${index + 1}. ID: ${row.id} | Time: ${timestamp} | BP: ${row.bp_value} | Kid1: ${row.kid1_status} | Kid2: ${row.kid2_status}`);
    });

    console.log('\n🗑️  Deleting records...\n');

    // Delete the records
    const deleteResult = await query(
      `DELETE FROM blood_pressure_events
       WHERE DATE(timestamp) = '2025-11-05'
       RETURNING id`
    );

    if (deleteResult && deleteResult.rows.length > 0) {
      console.log(`✅ Successfully deleted ${deleteResult.rows.length} record(s) from November 5th, 2025.`);
      logInfo('Test data deleted from database', {
        date: '2025-11-05',
        count: deleteResult.rows.length
      });
    } else {
      console.log('⚠️  No records were deleted.');
    }

    // Verify deletion
    const verifyResult = await query(
      `SELECT COUNT(*) as count FROM blood_pressure_events WHERE DATE(timestamp) = '2025-11-05'`
    );

    if (verifyResult && verifyResult.rows[0].count === '0') {
      console.log('\n✅ Verified: No records remain for November 5th, 2025.');
    }

    // Show remaining records count
    const totalResult = await query(
      `SELECT COUNT(*) as count FROM blood_pressure_events`
    );

    if (totalResult) {
      console.log(`\n📊 Total records remaining in database: ${totalResult.rows[0].count}`);
    }

  } catch (error) {
    console.error('❌ Error deleting test data:', error);
    logError('Failed to delete test data', error);
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

// Run the deletion
deleteTestData();
