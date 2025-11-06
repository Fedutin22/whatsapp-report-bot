import { Router, Request, Response } from 'express';
import { query, isDatabaseAvailable } from '../database/db.service';
import { logInfo, logError } from '../utils/logger';
import { requireBearerAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * DELETE /api/admin/delete-test-data
 * Delete all records from November 5th, 2025 (testing day)
 * Requires bearer authentication
 */
router.delete('/api/admin/delete-test-data', requireBearerAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!isDatabaseAvailable()) {
      res.status(503).json({
        error: 'Database not available',
        message: 'Cannot delete data - database connection not established'
      });
      return;
    }

    logInfo('Admin requested deletion of test data from 2025-11-05');

    // First, check what will be deleted
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
      res.json({
        success: true,
        message: 'No records found for November 5th, 2025',
        deleted: 0,
        records: []
      });
      return;
    }

    const recordsToDelete = checkResult.rows.map(row => ({
      id: row.id,
      timestamp: new Date(row.timestamp).toISOString(),
      bpValue: row.bp_value,
      kid1Status: row.kid1_status,
      kid2Status: row.kid2_status
    }));

    // Delete the records
    const deleteResult = await query(
      `DELETE FROM blood_pressure_events
       WHERE DATE(timestamp) = '2025-11-05'
       RETURNING id`
    );

    const deletedCount = deleteResult ? deleteResult.rows.length : 0;

    logInfo('Test data deleted successfully', {
      date: '2025-11-05',
      count: deletedCount
    });

    // Get remaining total count
    const totalResult = await query(
      `SELECT COUNT(*) as count FROM blood_pressure_events`
    );

    const remainingTotal = totalResult ? parseInt(totalResult.rows[0].count) : 0;

    res.json({
      success: true,
      message: `Successfully deleted ${deletedCount} record(s) from November 5th, 2025`,
      deleted: deletedCount,
      remainingTotal,
      deletedRecords: recordsToDelete
    });

  } catch (error) {
    logError('Failed to delete test data', error);
    res.status(500).json({
      error: 'Failed to delete test data',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/preview-test-data
 * Preview records from November 5th, 2025 without deleting
 * Requires bearer authentication
 */
router.get('/api/admin/preview-test-data', requireBearerAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    if (!isDatabaseAvailable()) {
      res.status(503).json({
        error: 'Database not available'
      });
      return;
    }

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
      res.json({
        count: 0,
        message: 'No records found for November 5th, 2025',
        records: []
      });
      return;
    }

    const records = checkResult.rows.map(row => ({
      id: row.id,
      timestamp: new Date(row.timestamp).toLocaleString('ru-RU'),
      bpValue: row.bp_value,
      kid1Status: row.kid1_status,
      kid2Status: row.kid2_status
    }));

    res.json({
      count: records.length,
      message: `Found ${records.length} record(s) from November 5th, 2025`,
      records
    });

  } catch (error) {
    logError('Failed to preview test data', error);
    res.status(500).json({
      error: 'Failed to preview test data'
    });
  }
});

export default router;
