import { Router, Request, Response } from 'express';
import { config } from '../config/env';
import { getRecentEvents, getStatistics } from '../services/event-logger.service';
import { whatsappClient } from '../services/whatsapp.service';
import { logInfo, logError } from '../utils/logger';

const router = Router();

/**
 * GET /dashboard
 * Web dashboard for monitoring blood pressure reports
 */
router.get('/dashboard', (_req: Request, res: Response) => {
  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Blood Pressure Monitor Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 30px;
        }

        h1 {
            color: #333;
            font-size: 32px;
            margin-bottom: 10px;
        }

        .subtitle {
            color: #666;
            font-size: 16px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .stat-label {
            color: #666;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }

        .stat-value {
            color: #333;
            font-size: 36px;
            font-weight: bold;
        }

        .stat-unit {
            color: #999;
            font-size: 18px;
            margin-left: 5px;
        }

        .action-bar {
            background: white;
            padding: 20px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            margin-bottom: 30px;
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }

        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
            background: #f0f0f0;
            color: #333;
        }

        .btn-secondary:hover {
            background: #e0e0e0;
        }

        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .reports-section {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }

        .section-title {
            font-size: 24px;
            color: #333;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .table-container {
            overflow-x: auto;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th {
            background: #f8f9fa;
            padding: 15px;
            text-align: left;
            font-weight: 600;
            color: #333;
            border-bottom: 2px solid #e0e0e0;
        }

        td {
            padding: 15px;
            border-bottom: 1px solid #f0f0f0;
        }

        tr:hover {
            background: #f8f9fa;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }

        .badge-success {
            background: #d4edda;
            color: #155724;
        }

        .badge-danger {
            background: #f8d7da;
            color: #721c24;
        }

        .badge-warning {
            background: #fff3cd;
            color: #856404;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }

        .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .alert {
            padding: 15px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
        }

        .alert-success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .alert-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }

        .status-online {
            background: #28a745;
            box-shadow: 0 0 10px #28a745;
        }

        .status-offline {
            background: #dc3545;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Blood Pressure Monitor</h1>
            <p class="subtitle">Real-time monitoring dashboard for senior health tracking</p>
        </div>

        <div id="alert" class="alert"></div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Total Reports</div>
                <div class="stat-value" id="totalReports">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Average BP</div>
                <div class="stat-value" id="averageBP">-<span class="stat-unit">mmHg</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">High BP Alerts</div>
                <div class="stat-value" id="highBPCount">-<span class="stat-unit">times</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Success Rate</div>
                <div class="stat-value" id="successRate">-<span class="stat-unit">%</span></div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Last Report</div>
                <div class="stat-value" id="lastReport" style="font-size: 20px;">-</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">System Status</div>
                <div class="stat-value" style="font-size: 20px;">
                    <span class="status-indicator status-online"></span>
                    <span id="systemStatus">Online</span>
                </div>
            </div>
        </div>

        <div class="action-bar">
            <button class="btn btn-primary" onclick="sendMenu()" id="sendMenuBtn">
                📤 Send Menu to Senior
            </button>
            <button class="btn btn-secondary" onclick="refreshData()">
                🔄 Refresh Data
            </button>
            <button class="btn btn-secondary" onclick="downloadCSV()">
                📥 Download CSV
            </button>
        </div>

        <div class="reports-section" style="margin-bottom: 30px;">
            <div class="section-title">
                📈 Daily Average Blood Pressure
            </div>
            <div class="table-container">
                <div class="loading" id="loadingDailyAverages">
                    <div class="spinner"></div>
                    <p>Loading daily averages...</p>
                </div>
                <table id="dailyAveragesTable" style="display: none;">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Average BP (mmHg)</th>
                            <th>Measurements</th>
                        </tr>
                    </thead>
                    <tbody id="dailyAveragesBody">
                    </tbody>
                </table>
            </div>
        </div>

        <div class="reports-section">
            <div class="section-title">
                📋 Recent Blood Pressure Reports
            </div>
            <div class="table-container">
                <div class="loading" id="loading">
                    <div class="spinner"></div>
                    <p>Loading reports...</p>
                </div>
                <table id="reportsTable" style="display: none;">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>BP Value</th>
                            <th>Kid 1 Status</th>
                            <th>Kid 2 Status</th>
                        </tr>
                    </thead>
                    <tbody id="reportsBody">
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        // Load data on page load
        window.addEventListener('DOMContentLoaded', () => {
            loadDashboardData();
        });

        async function loadDashboardData() {
            try {
                const [events, stats, dailyAverages] = await Promise.all([
                    fetch('/api/events').then(r => r.json()),
                    fetch('/api/statistics').then(r => r.json()),
                    fetch('/api/daily-averages').then(r => r.json())
                ]);

                // Update statistics
                document.getElementById('totalReports').textContent = stats.totalEvents;
                document.getElementById('averageBP').textContent = stats.averageBP || '-';
                document.getElementById('highBPCount').textContent = stats.highBPCount || '0';
                document.getElementById('successRate').textContent = stats.successRate;

                // Update last report time (events are in DESC order, so first is newest)
                if (events.length > 0) {
                    const lastEvent = events[0];
                    const date = new Date(lastEvent.timestamp);
                    document.getElementById('lastReport').textContent =
                        date.toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                } else {
                    document.getElementById('lastReport').textContent = 'No reports yet';
                }

                // Update daily averages table
                const dailyAveragesBody = document.getElementById('dailyAveragesBody');
                dailyAveragesBody.innerHTML = '';

                dailyAverages.forEach(day => {
                    const row = document.createElement('tr');
                    const date = new Date(day.date);
                    const dateStr = date.toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });

                    const bpClass = day.avgBP > 160 ? 'badge-danger' :
                                   day.avgBP > 140 ? 'badge-warning' : 'badge-success';

                    row.innerHTML = \`
                        <td>\${dateStr}</td>
                        <td><span class="badge \${bpClass}">\${day.avgBP}</span></td>
                        <td>\${day.count}</td>
                    \`;

                    dailyAveragesBody.appendChild(row);
                });

                // Show daily averages table, hide loading
                document.getElementById('loadingDailyAverages').style.display = 'none';
                document.getElementById('dailyAveragesTable').style.display = 'table';

                // Update recent reports table
                const tbody = document.getElementById('reportsBody');
                tbody.innerHTML = '';

                events.reverse().forEach(event => {
                    const row = document.createElement('tr');

                    const date = new Date(event.timestamp);
                    const timeStr = date.toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });

                    const bpClass = event.value === '>160' ? 'badge-danger' : 'badge-success';
                    const kid1Class = event.kid1Status === 'sent' ? 'badge-success' : 'badge-danger';
                    const kid2Class = event.kid2Status === 'sent' ? 'badge-success' : 'badge-danger';

                    row.innerHTML = \`
                        <td>\${timeStr}</td>
                        <td><span class="badge \${bpClass}">\${event.value}</span></td>
                        <td><span class="badge \${kid1Class}">\${event.kid1Status}</span></td>
                        <td><span class="badge \${kid2Class}">\${event.kid2Status}</span></td>
                    \`;

                    tbody.appendChild(row);
                });

                // Show table, hide loading
                document.getElementById('loading').style.display = 'none';
                document.getElementById('reportsTable').style.display = 'table';

            } catch (error) {
                console.error('Failed to load dashboard data:', error);
                showAlert('Failed to load data. Please refresh the page.', 'error');
            }
        }

        async function sendMenu() {
            const btn = document.getElementById('sendMenuBtn');
            btn.disabled = true;
            btn.textContent = 'Sending...';

            try {
                const response = await fetch('/api/send-menu-internal', {
                    method: 'POST'
                });

                if (response.ok) {
                    showAlert('✅ Menu sent successfully to senior!', 'success');
                } else {
                    throw new Error('Failed to send menu');
                }
            } catch (error) {
                showAlert('❌ Failed to send menu. Please try again.', 'error');
            } finally {
                btn.disabled = false;
                btn.textContent = '📤 Send Menu to Senior';
            }
        }

        function refreshData() {
            document.getElementById('loading').style.display = 'block';
            document.getElementById('reportsTable').style.display = 'none';
            document.getElementById('loadingDailyAverages').style.display = 'block';
            document.getElementById('dailyAveragesTable').style.display = 'none';
            loadDashboardData();
        }

        function downloadCSV() {
            window.location.href = '/api/download-csv';
        }

        function showAlert(message, type) {
            const alert = document.getElementById('alert');
            alert.className = 'alert alert-' + type;
            alert.textContent = message;
            alert.style.display = 'block';

            setTimeout(() => {
                alert.style.display = 'none';
            }, 5000);
        }
    </script>
</body>
</html>
  `;

  res.send(html);
});

/**
 * GET /api/events
 * Get recent BP events as JSON
 */
router.get('/api/events', async (_req: Request, res: Response) => {
  try {
    const events = await getRecentEvents(50);
    res.json(events);
  } catch (error) {
    logError('Failed to get events for dashboard', error);
    res.status(500).json({ error: 'Failed to load events' });
  }
});

/**
 * GET /api/statistics
 * Get statistics for dashboard
 */
router.get('/api/statistics', async (_req: Request, res: Response) => {
  try {
    const stats = await getStatistics();
    res.json(stats);
  } catch (error) {
    logError('Failed to get statistics for dashboard', error);
    res.status(500).json({ error: 'Failed to load statistics' });
  }
});

/**
 * POST /api/send-menu-internal
 * Internal endpoint to send menu (no auth required from dashboard)
 */
router.post('/api/send-menu-internal', async (_req: Request, res: Response) => {
  try {
    logInfo('Manual menu send triggered from dashboard');

    const messageId = await whatsappClient.sendInteractiveMenu(config.phoneNumbers.senior);

    logInfo('Menu sent successfully from dashboard', { messageId });
    res.json({ success: true, messageId });
  } catch (error) {
    logError('Failed to send menu from dashboard', error);
    res.status(500).json({ error: 'Failed to send menu' });
  }
});

/**
 * GET /api/download-csv
 * Download events CSV file
 */
router.get('/api/download-csv', (_req: Request, res: Response) => {
  const fs = require('fs');
  const path = require('path');

  const csvPath = path.resolve(process.cwd(), 'data', 'events.csv');

  if (fs.existsSync(csvPath)) {
    res.download(csvPath, 'blood-pressure-events.csv');
  } else {
    res.status(404).json({ error: 'CSV file not found' });
  }
});

/**
 * GET /api/daily-averages
 * Get daily average BP statistics
 */
router.get('/api/daily-averages', async (_req: Request, res: Response) => {
  try {
    const { getDailyAverages } = require('../services/daily-report.service');
    const dailyAverages = await getDailyAverages(30); // Last 30 days
    res.json(dailyAverages);
  } catch (error) {
    logError('Failed to get daily averages for dashboard', error);
    res.status(500).json({ error: 'Failed to load daily averages' });
  }
});

export default router;
