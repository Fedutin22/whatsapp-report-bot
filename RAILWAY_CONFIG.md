# Railway Environment Configuration

## Required Environment Variables

Set these in Railway Dashboard → Variables:

```bash
# Server
PORT=3000
NODE_ENV=production

# WhatsApp Cloud API Credentials
WHATSAPP_TOKEN=EAAG...your-permanent-access-token
PHONE_NUMBER_ID=813491991855255
VERIFY_TOKEN=my-webhook-verify-token-123

# Phone Numbers (E.164 format, digits only, no '+')
SENIOR_NUMBER=37122373487
KID1=37127668166
KID2=37127668166

# Security
SEND_MENU_BEARER=a055cce65c4a5c849b7c76c1d5b5cedf2717942abf4591de1bc1cec6a7a2c31a
ENABLE_WEBHOOK_SIGNATURE=false

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=10

# Scheduling - IMPORTANT: Set to true to enable hourly menu sending
ENABLE_DAILY_SCHEDULE=true
TIMEZONE=Europe/Riga

# Logging
LOG_LEVEL=info
```

## Important Notes

1. **KID1 and KID2** replaced the old CAREGIVER1/CAREGIVER2 variables
2. **ENABLE_DAILY_SCHEDULE=true** - Despite the name, this now sends the menu **every hour**
3. **TIMEZONE** - Ensure this matches your local timezone for accurate scheduling
4. **NODE_ENV=production** - Set this for Railway deployment

## Features Enabled

- ✅ Hourly automatic menu sending to senior
- ✅ Russian language messages
- ✅ Green checkmark emojis for normal readings
- ✅ Critical alert with ❗️ for BP >160
- ✅ Automatic notifications to both kids

## Webhook URL

After deployment, configure WhatsApp webhook:
- **Callback URL**: `https://your-railway-app.up.railway.app/webhook`
- **Verify Token**: Value of `VERIFY_TOKEN` variable

## Health Check

Test deployment at: `https://your-railway-app.up.railway.app/health`
