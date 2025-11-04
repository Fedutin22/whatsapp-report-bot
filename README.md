# WhatsApp Blood Pressure Bot

A Node.js TypeScript bot that enables a senior to quickly report blood pressure ranges to caregivers via WhatsApp interactive menus.

## Features

- Interactive WhatsApp list with 6 blood pressure range options
- Instant confirmation to senior (< 3 seconds)
- Automatic notifications to 2 caregivers
- CSV event logging with delivery status
- Bearer token authentication
- Rate limiting protection
- Optional daily scheduled menu sending
- Docker containerization
- Comprehensive error handling

## Prerequisites

- Node.js 18+ (for local development)
- Docker & Docker Compose (for containerized deployment)
- WhatsApp Business Account with Cloud API access
- Meta Business App with Phone Number ID and Access Token

## WhatsApp Business API Setup

Before running the bot, you need to set up a WhatsApp Business Account:

### 1. Create Meta Business Account
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create a new app or use existing one
3. Add "WhatsApp" product to your app

### 2. Get WhatsApp Credentials
1. Navigate to WhatsApp > API Setup
2. Copy your:
   - **Phone Number ID** (e.g., `123456789000000`)
   - **Temporary Access Token** (you'll need to generate a permanent one)
3. Get your **Verify Token** (you create this yourself for webhook verification)

### 3. Generate Permanent Access Token
1. Go to App Settings > Basic
2. Copy your **App Secret**
3. Generate a permanent system user access token with `whatsapp_business_messaging` permission
4. Store securely in your `.env` file

### 4. Configure Webhook (After Deployment)
1. Deploy the bot to get a public URL (e.g., Railway, ngrok for testing)
2. In WhatsApp > Configuration, set:
   - **Callback URL**: `https://your-domain.com/webhook`
   - **Verify Token**: Your chosen verify token (same as in `.env`)
3. Subscribe to `messages` webhook field

### 5. Caregiver Onboarding
Both caregivers need to send at least one message to your WhatsApp Business number (e.g., "Start") to initiate a 24-hour session window.

## Installation

### Option 1: Local Development

1. Clone the repository:
```bash
git clone https://github.com/Fedutin22/whatsapp-report-bot.git
cd whatsapp-report-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file from example:
```bash
cp .env.example .env
```

4. Fill in your WhatsApp credentials and phone numbers in `.env`:
```env
PORT=3000
NODE_ENV=development

# WhatsApp Cloud API Credentials
WHATSAPP_TOKEN=EAAG...your-permanent-access-token
PHONE_NUMBER_ID=123456789000000
VERIFY_TOKEN=your-webhook-verify-token-here

# Phone Numbers (E.164 format, digits only, no '+')
SENIOR_NUMBER=3712XXXXXXX
CAREGIVER1=3712YYYYYYY
CAREGIVER2=3712ZZZZZZZ

# Security (Generate strong random string)
SEND_MENU_BEARER=generate-a-long-random-string-min-32-chars

# Optional: Enable daily scheduled menu
ENABLE_DAILY_SCHEDULE=false
DAILY_SEND_TIME=08:00
TIMEZONE=Europe/Riga
```

5. Build the project:
```bash
npm run build
```

6. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Option 2: Docker Deployment

1. Create `.env` file with your configuration (see above)

2. Build and start with Docker Compose:
```bash
docker-compose up -d
```

3. Check logs:
```bash
docker-compose logs -f
```

4. Stop the container:
```bash
docker-compose down
```

## API Endpoints

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2025-11-04T18:00:00.000Z",
  "environment": "production"
}
```

### GET /send-menu
Manually trigger sending the blood pressure menu to the senior.

**Authentication:** Bearer token (SEND_MENU_BEARER)

**Example:**
```bash
curl -H "Authorization: Bearer your-bearer-token" \
  http://localhost:3000/send-menu
```

**Response:**
```json
{
  "success": true,
  "messageId": "wamid.xxx",
  "to": "3712XXXXXXX",
  "timestamp": "2025-11-04T18:00:00.000Z"
}
```

### GET /webhook
WhatsApp webhook verification endpoint (called by Meta).

### POST /webhook
Receives WhatsApp events (messages, status updates).

## Usage Flow

1. **Trigger Menu**: Call `/send-menu` or wait for daily scheduled time
2. **Senior Receives List**: Interactive WhatsApp list with 6 BP options
3. **Senior Selects**: Taps one option (e.g., "130")
4. **Bot Processes**:
   - Sends confirmation to senior: "Received: 130. Sent to caregivers."
   - Sends to caregivers: "Blood pressure (senior selection): 130"
   - Logs event to CSV with timestamps and delivery status
5. **Error Handling**: If both caregivers fail, senior receives error message

## Data Logging

All events are logged to `data/events.csv` with the following structure:

| Timestamp | Senior Number | Value | CG1 Status | CG2 Status | CG1 Message ID | CG2 Message ID | Error Details |
|-----------|---------------|-------|------------|------------|----------------|----------------|---------------|
| ISO8601   | Phone number  | BP    | sent/failed| sent/failed| WhatsApp ID    | WhatsApp ID    | JSON          |

## Webhook Setup with ngrok (Local Testing)

For local development, use ngrok to expose your localhost:

1. Install ngrok: https://ngrok.com/download

2. Start your bot locally:
```bash
npm run dev
```

3. In another terminal, start ngrok:
```bash
ngrok http 3000
```

4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

5. Configure WhatsApp webhook in Meta dashboard:
   - Callback URL: `https://abc123.ngrok.io/webhook`
   - Verify Token: Your `VERIFY_TOKEN` from `.env`

## Deployment to Railway

1. Push your code to GitHub (without `.env`)

2. Go to [Railway.app](https://railway.app/) and create new project

3. Connect your GitHub repository

4. Add environment variables in Railway dashboard (copy from `.env`)

5. Railway will auto-deploy and provide a public URL

6. Configure WhatsApp webhook with your Railway URL

## Security Best Practices

- Use strong random `SEND_MENU_BEARER` token (min 32 characters)
- Never commit `.env` file to version control
- Rotate WhatsApp access tokens periodically
- Use HTTPS for all webhook endpoints (required by WhatsApp)
- Enable webhook signature verification in production (set `ENABLE_WEBHOOK_SIGNATURE=true`)
- Monitor logs regularly for unauthorized access attempts

## Troubleshooting

### Webhook verification fails
- Ensure `VERIFY_TOKEN` in `.env` matches what you set in Meta dashboard
- Check server logs for verification attempts
- Verify webhook URL is publicly accessible

### Messages not sending
- Check WhatsApp access token is valid and permanent
- Verify `PHONE_NUMBER_ID` is correct
- Ensure phone numbers are in E.164 format (digits only)
- Check WhatsApp API rate limits

### Caregivers not receiving messages
- Verify both caregivers have initiated conversation with your WhatsApp Business number
- Check 24-hour session window hasn't expired
- Review CSV logs for delivery status

### Bot not responding to button presses
- Verify webhook is configured correctly in Meta dashboard
- Check POST /webhook logs for incoming events
- Ensure bot has subscribed to `messages` webhook field

## Project Structure

```
whatsapp-bot/
├── src/
│   ├── config/           # Environment configuration
│   │   └── env.ts
│   ├── services/         # Business logic
│   │   ├── whatsapp.service.ts
│   │   ├── webhook-parser.service.ts
│   │   ├── blood-pressure.service.ts
│   │   ├── event-logger.service.ts
│   │   └── scheduler.service.ts
│   ├── routes/           # Express routes
│   │   ├── menu.routes.ts
│   │   └── webhook.routes.ts
│   ├── middleware/       # Auth, validation
│   │   └── auth.middleware.ts
│   ├── types/            # TypeScript interfaces
│   │   └── whatsapp.types.ts
│   ├── utils/            # Helper functions
│   │   ├── logger.ts
│   │   └── phone.util.ts
│   └── server.ts         # Express app
├── data/                 # CSV logs (gitignored)
├── logs/                 # Application logs (gitignored)
├── dist/                 # Compiled JavaScript (gitignored)
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── .env.example
```

## Technologies

- **Runtime**: Node.js 18+
- **Language**: TypeScript 5
- **Framework**: Express.js
- **HTTP Client**: Axios
- **Logging**: Pino
- **Scheduling**: node-cron
- **Data Storage**: CSV (csv-writer)
- **Security**: Helmet, express-rate-limit
- **Containerization**: Docker

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT

## Support

For issues and questions, please open a GitHub issue or contact the maintainer.

---

Last Updated: 2025-11-04
Version: 1.0.0
