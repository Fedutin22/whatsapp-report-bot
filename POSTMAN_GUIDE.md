# Postman Collection Guide

## Files Created

1. **WhatsApp-BP-Bot.postman_collection.json** - Complete API collection with all endpoints
2. **WhatsApp-BP-Bot.postman_environment.json** - Local development environment
3. **WhatsApp-BP-Bot-Production.postman_environment.json** - Production Railway environment

---

## How to Import into Postman

### Step 1: Import Collection

1. Open **Postman**
2. Click **Import** button (top left)
3. Drag and drop **WhatsApp-BP-Bot.postman_collection.json** or click "Upload Files"
4. Click **Import**

### Step 2: Import Environments

1. Click **Import** again
2. Import **WhatsApp-BP-Bot.postman_environment.json** (Local)
3. Import **WhatsApp-BP-Bot-Production.postman_environment.json** (Railway)

### Step 3: Select Environment

In the top-right corner of Postman:
- Select **"WhatsApp BP Bot - Local"** for testing locally
- Select **"WhatsApp BP Bot - Production (Railway)"** for testing on Railway

---

## Collection Structure

### 1. Health & Status
- **Health Check** - `GET /health`
  - No auth required
  - Returns server status, version, timestamp

### 2. Menu Operations
- **Send Menu to Senior (External)** - `GET /send-menu`
  - Requires: `Authorization: Bearer {{SEND_MENU_BEARER}}`
  - Triggers menu send to senior

- **Send Menu to Senior (Internal)** - `POST /api/send-menu-internal`
  - No auth required (used by dashboard)

### 3. WhatsApp Webhook
- **Webhook Verification** - `GET /webhook`
  - Used by Meta to verify webhook
  - Parameters: hub.mode, hub.verify_token, hub.challenge

- **Webhook Events** - `POST /webhook`
  - Receives WhatsApp events (button presses)
  - Includes sample request body

### 4. Dashboard & Analytics
- **Dashboard Web UI** - `GET /dashboard`
  - Opens HTML dashboard in browser

- **Get Recent Events** - `GET /api/events`
  - Returns last 50 BP events as JSON

- **Get Statistics** - `GET /api/statistics`
  - Returns overall stats (total, average, success rate)

- **Get Daily Averages** - `GET /api/daily-averages`
  - Returns daily averages for last 30 days

- **Download CSV** - `GET /api/download-csv`
  - Downloads all events as CSV file

### 5. Admin Operations
- **Preview Test Data** - `GET /api/admin/preview-test-data`
  - Requires: `Authorization: Bearer {{SEND_MENU_BEARER}}`
  - Preview Nov 5th records before deletion

- **Delete Test Data** - `DELETE /api/admin/delete-test-data`
  - Requires: `Authorization: Bearer {{SEND_MENU_BEARER}}`
  - Deletes all Nov 5th test records

---

## Environment Variables

### Both Environments Include:

| Variable | Description |
|----------|-------------|
| `BASE_URL` | API base URL (localhost or Railway) |
| `SEND_MENU_BEARER` | Bearer token for authenticated endpoints |
| `VERIFY_TOKEN` | WhatsApp webhook verification token |
| `SENIOR_NUMBER` | Senior's phone number |
| `KID1` | Caregiver 1 phone number |
| `KID2` | Caregiver 2 phone number |
| `WHATSAPP_TOKEN` | WhatsApp API access token (marked as secret) |
| `PHONE_NUMBER_ID` | WhatsApp Business phone number ID |

### Local Environment:
- `BASE_URL`: `http://localhost:3000`

### Production Environment:
- `BASE_URL`: `https://whatsapp-report-bot-production.up.railway.app`

---

## Usage Examples

### 1. Send Menu to Senior

**Request:**
```
GET {{BASE_URL}}/send-menu
Authorization: Bearer {{SEND_MENU_BEARER}}
```

**Response:**
```json
{
  "success": true,
  "messageId": "wamid.HBgLMzcxMjI...",
  "to": "37129953062",
  "timestamp": "2025-11-06T20:15:30.000Z"
}
```

### 2. Get Statistics

**Request:**
```
GET {{BASE_URL}}/api/statistics
```

**Response:**
```json
{
  "totalEvents": 45,
  "successfulDeliveries": 42,
  "failedDeliveries": 3,
  "successRate": 93.33,
  "averageBP": 135,
  "highBPCount": 5
}
```

### 3. Get Daily Averages

**Request:**
```
GET {{BASE_URL}}/api/daily-averages
```

**Response:**
```json
[
  {
    "date": "2025-11-06",
    "avgBP": 132,
    "count": 8
  },
  {
    "date": "2025-11-05",
    "avgBP": 140,
    "count": 12
  }
]
```

### 4. Delete Test Data (Admin)

**Request:**
```
DELETE {{BASE_URL}}/api/admin/delete-test-data
Authorization: Bearer {{SEND_MENU_BEARER}}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully deleted 15 record(s) from November 5th, 2025",
  "deleted": 15,
  "remainingTotal": 30,
  "deletedRecords": [...]
}
```

---

## Quick Test Sequence

1. **Health Check** → Verify server is running
2. **Get Statistics** → See current stats
3. **Get Daily Averages** → View daily trends
4. **Preview Test Data** → Check what will be deleted
5. **Delete Test Data** → Remove Nov 5th data
6. **Get Statistics** → Verify updated stats

---

## Tips

1. **Switch Environments Easily**: Use the environment dropdown in top-right corner
2. **View Variables**: Click the eye icon next to environment selector
3. **Test Locally First**: Test on Local environment before Production
4. **Check Console**: Use Postman Console (bottom left) to see full request/response
5. **Save Responses**: Save example responses for documentation

---

## Troubleshooting

### 401 Unauthorized
- Check `SEND_MENU_BEARER` token is correct
- Ensure `Authorization` header is included

### 404 Not Found
- Verify `BASE_URL` is correct
- Check Railway deployment is complete

### 503 Service Unavailable
- Database might not be connected
- Check Railway logs for errors

---

## Railway Production URL

Your production API is available at:
```
https://whatsapp-report-bot-production.up.railway.app
```

**Dashboard:**
https://whatsapp-report-bot-production.up.railway.app/dashboard

**Health Check:**
https://whatsapp-report-bot-production.up.railway.app/health

---

## Security Notes

- Never commit Postman files with real tokens to version control
- Keep `SEND_MENU_BEARER` and `WHATSAPP_TOKEN` secret
- Use environment variables for sensitive data
- Regularly rotate access tokens
