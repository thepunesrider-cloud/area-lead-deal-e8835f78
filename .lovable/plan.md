

# Redirect WhatsApp Group Leads to LeadsNearby Supabase

## Overview

You want to send WhatsApp group leads to your **LeadsNearby** Supabase project (`rwhgqhzvheoubqyuqwhq`) instead of (or in addition to) the current Lovable Cloud project.

## What You Need to Do

This is a **configuration change** on your Node.js WhatsApp bot - no code changes needed in this Lovable project.

### Option A: Send Leads Only to LeadsNearby

Update your `whatsapp-bot/.env` file on your server:

```env
# Change this line to point to LeadsNearby project
WEBHOOK_URL=https://rwhgqhzvheoubqyuqwhq.supabase.co/functions/v1/whatsapp-group-bot

# Update AUTH_KEY to match the secret configured in LeadsNearby
AUTH_KEY=your_leadsnearby_auth_key
```

Then restart the bot.

### Option B: Send Leads to Both Projects (Dual-Stream)

If you want leads in BOTH Supabase projects, modify the `whatsapp-bot/index.js` file:

```javascript
// Replace the sendToWebhook function (around line 92)
async function sendToWebhook(data) {
  const webhooks = [
    {
      url: 'https://rwhgqhzvheoubqyuqwhq.supabase.co/functions/v1/whatsapp-group-bot',
      authKey: 'your_leadsnearby_auth_key'
    },
    {
      url: 'https://xmyyhfgekfulnidukrpj.supabase.co/functions/v1/whatsapp-group-bot',
      authKey: CONFIG.AUTH_KEY
    }
  ];

  const results = await Promise.all(
    webhooks.map(async (webhook) => {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${webhook.authKey}`
          },
          body: JSON.stringify(data)
        });
        return await response.json();
      } catch (error) {
        console.error(`Webhook error (${webhook.url}):`, error.message);
        return null;
      }
    })
  );

  console.log('Webhook responses:', results);
  return results;
}
```

## Important: Auth Key Configuration

Make sure the `WHATSAPP_BOT_AUTH_KEY` secret is configured in your LeadsNearby Supabase project:
1. Go to LeadsNearby Supabase Dashboard
2. Navigate to Settings → Edge Functions → Secrets
3. Add or verify `WHATSAPP_BOT_AUTH_KEY` secret
4. Use this same value as `AUTH_KEY` in your bot's `.env`

## Flow Diagram

```text
+------------------+     +-------------------------------------+
| Node.js Bot      |     |                                     |
| (WhatsApp Web.js)| --> | LeadsNearby Supabase               |
+------------------+     | rwhgqhzvheoubqyuqwhq               |
                         | /functions/v1/whatsapp-group-bot    |
                         +-------------------------------------+
                                        |
                                        v
                         +-------------------------------------+
                         | leads table                         |
                         | whatsapp_messages table             |
                         +-------------------------------------+
```

## Summary

| Step | Action |
|------|--------|
| 1 | Open your server where the WhatsApp bot runs |
| 2 | Edit `whatsapp-bot/.env` file |
| 3 | Change `WEBHOOK_URL` to `https://rwhgqhzvheoubqyuqwhq.supabase.co/functions/v1/whatsapp-group-bot` |
| 4 | Update `AUTH_KEY` to match LeadsNearby's secret |
| 5 | Restart the bot (`npm start`) |

