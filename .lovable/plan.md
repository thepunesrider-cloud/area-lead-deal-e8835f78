

# Add Dual-Stream Support to WhatsApp Bot

## Overview

Modify the WhatsApp bot to send leads to **both** Supabase projects simultaneously:
- **Lovable Cloud**: `xmyyhfgekfulnidukrpj` (current project)
- **LeadsNearby**: `rwhgqhzvheoubqyuqwhq` (your external project)

This ensures leads are captured in both systems for redundancy and flexibility.

## Changes Required

### 1. Update `.env.example` Configuration

Add new environment variables to support multiple webhook destinations:

```env
# Primary Webhook (Lovable Cloud)
WEBHOOK_URL_PRIMARY=https://xmyyhfgekfulnidukrpj.supabase.co/functions/v1/whatsapp-group-bot
AUTH_KEY_PRIMARY=your_lovable_auth_key

# Secondary Webhook (LeadsNearby)
WEBHOOK_URL_SECONDARY=https://rwhgqhzvheoubqyuqwhq.supabase.co/functions/v1/whatsapp-group-bot
AUTH_KEY_SECONDARY=your_leadsnearby_auth_key

# Enable/disable dual-stream (true/false)
DUAL_STREAM_ENABLED=true
```

### 2. Update `index.js` Configuration Section

Modify the CONFIG object to support multiple webhooks:

```javascript
const CONFIG = {
  // Webhook destinations
  WEBHOOKS: [
    {
      name: 'Lovable Cloud',
      url: process.env.WEBHOOK_URL_PRIMARY || 'https://xmyyhfgekfulnidukrpj.supabase.co/functions/v1/whatsapp-group-bot',
      authKey: process.env.AUTH_KEY_PRIMARY || 'leadx_bot_secret_2024',
      enabled: true
    },
    {
      name: 'LeadsNearby',
      url: process.env.WEBHOOK_URL_SECONDARY || '',
      authKey: process.env.AUTH_KEY_SECONDARY || '',
      enabled: process.env.DUAL_STREAM_ENABLED === 'true'
    }
  ].filter(w => w.enabled && w.url), // Only include enabled webhooks with URLs
  
  // ... rest of existing config
};
```

### 3. Replace `sendToWebhook` Function

Replace the single-destination function with a multi-destination version:

```javascript
async function sendToWebhook(data) {
  const results = await Promise.allSettled(
    CONFIG.WEBHOOKS.map(async (webhook) => {
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${webhook.authKey}`
          },
          body: JSON.stringify(data)
        });
        
        const result = await response.json();
        console.log(`📤 [${webhook.name}] Response:`, result);
        return { webhook: webhook.name, success: true, result };
      } catch (error) {
        console.error(`[${webhook.name}] Webhook error:`, error.message);
        return { webhook: webhook.name, success: false, error: error.message };
      }
    })
  );
  
  // Log summary
  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
  const failed = results.filter(r => r.status === 'rejected' || !r.value?.success);
  
  console.log(`📊 Webhook Summary: ${successful.length} succeeded, ${failed.length} failed`);
  
  return results;
}
```

### 4. Update Ready Event Logging

Improve startup logging to show all configured webhooks:

```javascript
client.on('ready', async () => {
  console.log('\n WhatsApp Bot is ready!');
  console.log('\n Configured Webhooks:');
  CONFIG.WEBHOOKS.forEach((webhook, index) => {
    console.log(`   ${index + 1}. ${webhook.name}: ${webhook.url}`);
  });
  
  // ... rest of existing code
});
```

## File Changes Summary

| File | Action |
|------|--------|
| `whatsapp-bot/.env.example` | Add new dual-stream environment variables |
| `whatsapp-bot/index.js` | Update CONFIG, replace sendToWebhook function |

## Flow Diagram

```text
+------------------+
| WhatsApp Message |
+--------+---------+
         |
         v
+------------------+
| Node.js Bot      |
| (Process Lead)   |
+--------+---------+
         |
         v
+------------------+
| sendToWebhook()  |
+--------+---------+
         |
    +----+----+
    |         |
    v         v
+-------+  +------------+
|Lovable|  |LeadsNearby |
| Cloud |  | Supabase   |
+-------+  +------------+
```

## Setup Instructions (After Code Update)

1. Update your `.env` file on the bot server:
```env
WEBHOOK_URL_PRIMARY=https://xmyyhfgekfulnidukrpj.supabase.co/functions/v1/whatsapp-group-bot
AUTH_KEY_PRIMARY=9798d55914881e9af6023d590f0c59d5124bcc45fe4ff685be8e3563d3cb1e50

WEBHOOK_URL_SECONDARY=https://rwhgqhzvheoubqyuqwhq.supabase.co/functions/v1/whatsapp-group-bot
AUTH_KEY_SECONDARY=your_leadsnearby_auth_key_here

DUAL_STREAM_ENABLED=true
```

2. Restart the bot (`npm start` or `pm2 restart whatsapp-bot`)

3. Verify in console that both webhooks are listed on startup

## Important Notes

- Both webhooks are called in parallel using `Promise.allSettled` (one failure won't block the other)
- Backward compatible: if only primary is configured, it works like before
- Easy to toggle dual-stream on/off via `DUAL_STREAM_ENABLED`
- Each webhook can have its own auth key for security

