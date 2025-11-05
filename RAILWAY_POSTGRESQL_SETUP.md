# PostgreSQL Setup on Railway

## Step 1: Add PostgreSQL to Your Railway Project

1. Go to your Railway dashboard: https://railway.app/
2. Open your `whatsapp-report-bot-production` project
3. Click **"+ New"** button
4. Select **"Database" → "PostgreSQL"**
5. Railway will create a PostgreSQL database and auto-generate credentials

## Step 2: Get Database Connection String

1. Click on the **PostgreSQL service** in your project
2. Go to **"Variables"** tab
3. Copy the value of **`DATABASE_URL`**
   - It looks like: `postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway`

## Step 3: Add DATABASE_URL to Your App

1. Click on your **main app service** (whatsapp-report-bot)
2. Go to **"Variables"** tab
3. Click **"+ New Variable"**
4. Add:
   ```
   DATABASE_URL=postgresql://postgres:password@...
   ```
   (Paste the full connection string from Step 2)
5. Click **"Add"**

## Step 4: Run Database Migration

Railway will auto-redeploy your app. After deployment:

**Option A: Via Railway CLI (if you have it installed)**
```bash
railway run npm run migrate
```

**Option B: Via Railway Dashboard**
1. Go to your app's **Deployments** tab
2. Click on the latest deployment
3. Click **"View Logs"**
4. Look for migration messages

**Option C: Manual via Railway Shell**
1. In your app service, go to **Settings**
2. Scroll to **"Service"** section
3. Click **"Open Shell"**
4. Run: `npm run migrate`

## Step 5: Verify Setup

Visit your dashboard:
```
https://whatsapp-report-bot-production.up.railway.app/dashboard
```

If you see data, PostgreSQL is working! 🎉

## Database Tables Created

- **`blood_pressure_events`** - Stores all BP reports with full history
- **`subscription_tracking`** - Tracks when subscription prompts were sent

## Data Migration from CSV

If you had existing CSV data, it will still be accessible as a fallback. New events will be saved to PostgreSQL.

## Troubleshooting

### "Database not available" in logs
- Check that `DATABASE_URL` variable is set correctly
- Verify PostgreSQL service is running in Railway
- Check Railway logs for connection errors

### Migration fails
- Ensure PostgreSQL service is fully started
- Run migration manually: `railway run npm run migrate`
- Check that DATABASE_URL has correct permissions

### App crashes after adding database
- Check Railway deployment logs
- Verify all environment variables are set
- Make sure PostgreSQL service is in the same project

## Cost

Railway PostgreSQL:
- **Free tier**: 500MB storage
- **Paid**: $5/month for 1GB, scales up

Your usage (~90 events/month) = **FREE** ✅

---

**Need help?** Check Railway logs or Railway community support.
