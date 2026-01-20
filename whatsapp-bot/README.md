# LeadX WhatsApp Group Bot

Automatically imports leads from WhatsApp groups into LeadX.

## ⚠️ WARNING

This bot uses **whatsapp-web.js**, an unofficial WhatsApp API that:
- Violates WhatsApp Terms of Service
- May result in your phone number being banned
- Can break without notice when WhatsApp updates

**Use at your own risk!**

## Requirements

- Node.js 18+ 
- A WhatsApp account that's in your lead groups
- A server to run this bot 24/7 (VPS, Render, Railway, etc.)

## Quick Start

### 1. Install Dependencies

```bash
cd whatsapp-bot
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your settings
```

### 3. Run the Bot

```bash
npm start
```

### 4. Scan QR Code

When prompted, scan the QR code with your WhatsApp app:
1. Open WhatsApp on your phone
2. Go to Settings → Linked Devices
3. Tap "Link a Device"
4. Scan the QR code shown in terminal

### 5. Done!

The bot will now:
- Listen to all group messages
- Filter for lead-like messages
- Send them to your Supabase webhook
- Leads appear in your LeadX admin panel

## Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `WEBHOOK_URL` | (your supabase url) | Edge function endpoint |
| `AUTH_KEY` | `leadx_bot_secret_2024` | Secret for webhook auth |
| `TARGET_GROUPS` | (empty = all) | Comma-separated group IDs |
| `MIN_MESSAGE_LENGTH` | `20` | Ignore shorter messages |

## Filtering Groups

By default, the bot listens to ALL groups. To filter:

1. Run the bot once to see group IDs in console
2. Copy the IDs you want to monitor
3. Add to `.env`:
   ```
   TARGET_GROUPS=120363xxx@g.us,120363yyy@g.us
   ```
4. Restart the bot

## Hosting Options

### Option 1: Railway.app (Easy)
1. Push this folder to GitHub
2. Connect to Railway
3. Add environment variables
4. Deploy

### Option 2: Render.com
1. Create new Web Service
2. Connect GitHub repo
3. Set start command: `npm start`
4. Add environment variables

### Option 3: VPS (DigitalOcean, etc.)
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Clone and setup
git clone your-repo
cd whatsapp-bot
npm install
cp .env.example .env
nano .env  # Configure

# Run with PM2 (keeps running)
npm install -g pm2
pm2 start index.js --name leadx-bot
pm2 save
pm2 startup
```

## Troubleshooting

### QR Code Not Showing
- Delete `.wwebjs_auth` folder
- Restart bot

### Bot Disconnects Frequently
- Use a stable internet connection
- Consider using a dedicated phone number

### Messages Not Being Captured
- Check if message length > MIN_MESSAGE_LENGTH
- Check if group is in TARGET_GROUPS
- Check console for "Skipped" messages

### Webhook Errors
- Verify WEBHOOK_URL is correct
- Check Supabase edge function logs
- Verify AUTH_KEY matches

## Message Filtering

The bot uses these keywords to identify leads:
- English: rent, agreement, domicile, income, certificate, birth, death, address, flat, room, pg, society
- Marathi: नाव, पत्ता, भाड्याचा, करार, डोमिसाइल, प्रमाणपत्र
- Hindi: नाम, पता, किराया, एग्रीमेंट, सर्टिफिकेट

Messages with 10-digit phone numbers are also captured.

## Support

This is an unofficial integration. For issues:
1. Check whatsapp-web.js GitHub issues
2. Verify your Supabase webhook is working
3. Check console logs for errors
