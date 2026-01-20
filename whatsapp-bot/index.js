/**
 * LeadX WhatsApp Group Message Listener
 * 
 * IMPORTANT: This uses an unofficial WhatsApp API (whatsapp-web.js)
 * - Against WhatsApp Terms of Service
 * - Your number may get banned
 * - Use at your own risk
 * 
 * Setup:
 * 1. npm install
 * 2. Set your SUPABASE_URL and SUPABASE_ANON_KEY in .env
 * 3. npm start
 * 4. Scan QR code with WhatsApp
 * 5. Messages from target groups will be auto-imported as leads
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config();

// Configuration
const CONFIG = {
  // Your Supabase Edge Function URL
  WEBHOOK_URL: process.env.WEBHOOK_URL || 'https://xmyyhfgekfulnidukrpj.supabase.co/functions/v1/whatsapp-group-bot',
  
  // Optional: Only listen to specific groups (leave empty to listen to ALL groups)
  // To get group IDs: when bot starts, it will log all group names and IDs
  TARGET_GROUPS: process.env.TARGET_GROUPS ? process.env.TARGET_GROUPS.split(',') : [],
  
  // Minimum message length to process (filter out short messages like "ok", "done")
  MIN_MESSAGE_LENGTH: parseInt(process.env.MIN_MESSAGE_LENGTH) || 20,
  
  // Keywords that indicate a lead message (at least one must match)
  LEAD_KEYWORDS: [
    'rent', 'agreement', 'domicile', 'income', 'certificate',
    'birth', 'death', 'address', 'flat', 'room', 'pg', 'society',
    'नाव', 'पत्ता', 'भाड्याचा', 'करार', 'डोमिसाइल', 'प्रमाणपत्र',
    'नाम', 'पता', 'किराया', 'एग्रीमेंट', 'सर्टिफिकेट'
  ],
  
  // Secret key for webhook authentication
  AUTH_KEY: process.env.AUTH_KEY || 'leadx_bot_secret_2024'
};

// Initialize WhatsApp client with local authentication (saves session)
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './.wwebjs_auth'
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

// Track processed messages to avoid duplicates
const processedMessages = new Set();
const MAX_PROCESSED_CACHE = 10000;

/**
 * Check if message looks like a lead
 */
function isLikelyLead(message) {
  const lowerMessage = message.toLowerCase();
  
  // Check for keywords
  const hasKeyword = CONFIG.LEAD_KEYWORDS.some(keyword => 
    lowerMessage.includes(keyword.toLowerCase())
  );
  
  // Check for phone number pattern (10 digits)
  const hasPhone = /\d{10}/.test(message);
  
  // Likely a lead if has keyword OR has phone number with decent length
  return hasKeyword || (hasPhone && message.length > 30);
}

/**
 * Send message to webhook
 */
async function sendToWebhook(data) {
  try {
    const response = await fetch(CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.AUTH_KEY}`
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    console.log('📤 Webhook response:', result);
    return result;
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    return null;
  }
}

/**
 * Process incoming message
 */
async function processMessage(msg) {
  try {
    // Skip if already processed
    if (processedMessages.has(msg.id._serialized)) {
      return;
    }
    
    // Add to processed cache
    processedMessages.add(msg.id._serialized);
    if (processedMessages.size > MAX_PROCESSED_CACHE) {
      const first = processedMessages.values().next().value;
      processedMessages.delete(first);
    }
    
    // Get chat info
    const chat = await msg.getChat();
    
    // Only process group messages
    if (!chat.isGroup) {
      return;
    }
    
    // Check if this group is in target list (if specified)
    if (CONFIG.TARGET_GROUPS.length > 0 && !CONFIG.TARGET_GROUPS.includes(chat.id._serialized)) {
      return;
    }
    
    // Skip short messages
    if (!msg.body || msg.body.length < CONFIG.MIN_MESSAGE_LENGTH) {
      return;
    }
    
    // Check if likely a lead
    if (!isLikelyLead(msg.body)) {
      console.log(`⏭️ Skipped (not a lead): "${msg.body.substring(0, 50)}..."`);
      return;
    }
    
    // Get sender contact info
    const contact = await msg.getContact();
    
    // Prepare webhook payload
    const payload = {
      source: 'whatsapp_web_bot',
      message_id: msg.id._serialized,
      timestamp: msg.timestamp,
      
      // Message content
      message: msg.body,
      
      // Sender info
      sender_phone: contact.number,
      sender_name: contact.pushname || contact.name || null,
      
      // Group info
      group_id: chat.id._serialized,
      group_name: chat.name,
      
      // Forwarded message detection
      is_forwarded: msg.isForwarded || false,
      
      // Quote/reply info
      quoted_message: msg.hasQuotedMsg ? (await msg.getQuotedMessage()).body : null
    };
    
    console.log(`\n📩 New lead message from group: ${chat.name}`);
    console.log(`   From: ${payload.sender_name || payload.sender_phone}`);
    console.log(`   Message: ${msg.body.substring(0, 100)}...`);
    
    // Send to webhook
    await sendToWebhook(payload);
    
  } catch (error) {
    console.error('❌ Error processing message:', error.message);
  }
}

// QR Code generation
client.on('qr', (qr) => {
  console.log('\n📱 Scan this QR code with WhatsApp:\n');
  qrcode.generate(qr, { small: true });
  console.log('\n⚠️  Make sure you scan with the WhatsApp account that is in your lead groups!\n');
});

// Authentication success
client.on('authenticated', () => {
  console.log('✅ WhatsApp authenticated successfully!');
});

// Ready to receive messages
client.on('ready', async () => {
  console.log('\n🚀 WhatsApp Bot is ready!');
  console.log(`📡 Webhook URL: ${CONFIG.WEBHOOK_URL}`);
  
  // List all groups
  const chats = await client.getChats();
  const groups = chats.filter(chat => chat.isGroup);
  
  console.log('\n📋 Available groups:');
  groups.forEach((group, index) => {
    const isTarget = CONFIG.TARGET_GROUPS.length === 0 || CONFIG.TARGET_GROUPS.includes(group.id._serialized);
    console.log(`   ${index + 1}. ${group.name} ${isTarget ? '✅' : '❌'}`);
    console.log(`      ID: ${group.id._serialized}`);
  });
  
  if (CONFIG.TARGET_GROUPS.length === 0) {
    console.log('\n⚡ Listening to ALL groups (no filter set)');
  } else {
    console.log(`\n⚡ Listening to ${CONFIG.TARGET_GROUPS.length} target groups`);
  }
  
  console.log('\n👂 Waiting for messages...\n');
});

// Message received
client.on('message', processMessage);

// Also catch messages from groups the user is member of
client.on('message_create', async (msg) => {
  // Only process messages from others, not our own
  if (!msg.fromMe) {
    await processMessage(msg);
  }
});

// Error handling
client.on('auth_failure', (msg) => {
  console.error('❌ Authentication failed:', msg);
});

client.on('disconnected', (reason) => {
  console.log('🔌 WhatsApp disconnected:', reason);
  console.log('🔄 Attempting to reconnect...');
  client.initialize();
});

// Start the client
console.log('🔄 Initializing WhatsApp Web client...');
console.log('   This may take a minute on first run...\n');
client.initialize();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down...');
  await client.destroy();
  process.exit(0);
});
