import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hub-signature-256",
};

// Enhanced AI parsing prompt for extracting lead data from WhatsApp messages
const PARSING_PROMPT = `You are an expert at extracting lead information from WhatsApp messages.
The messages may be in English, Hindi, Marathi, or a mix of these languages.

IMPORTANT: Messages often contain both ADDRESS and SPECIAL INSTRUCTIONS mixed together.
- ADDRESS: Street name, building name, area, city, PIN code
- SPECIAL INSTRUCTIONS: Time slots (e.g., "Today 7:30", "any one", "urgent", "tomorrow morning"), emojis, notes about availability

Extract the following fields from the message:
1. customer_name - The name of the customer (if mentioned)
2. customer_phone - 10-digit Indian phone number (remove +91, spaces, dashes)
3. location_address - ONLY the address part: building/flat, street, area, city, PIN code. Do NOT include time or instructions.
4. service_type - One of: rent_agreement, maha_eseva, domicile, other
5. special_instructions - Everything that is NOT address: time slots, availability notes, urgency, any instructions like "Today 7:30", "any one", "call before coming", emojis with meaning

Examples:
Message: "5-A,Bunglow Aashish,Pali Hill, Road Nargis Dutt Road, Bandra West, Mumbai, Pin code - 400052. Today 7:30 any one👆"
Output:
{
  "customer_name": null,
  "customer_phone": null,
  "location_address": "5-A, Bunglow Aashish, Pali Hill Road, Nargis Dutt Road, Bandra West, Mumbai, 400052",
  "service_type": "rent_agreement",
  "special_instructions": "Today 7:30, any one available"
}

Message: "Ramesh Sharma 9876543210 flat 101 shanti nagar thane urgent need by evening"
Output:
{
  "customer_name": "Ramesh Sharma",
  "customer_phone": "9876543210",
  "location_address": "Flat 101, Shanti Nagar, Thane",
  "service_type": "rent_agreement",
  "special_instructions": "Urgent, need by evening"
}

Return ONLY a valid JSON object with these exact fields. If a field cannot be determined, use null.`;

interface ParsedLead {
  customer_name: string | null;
  customer_phone: string | null;
  location_address: string | null;
  service_type: string | null;
  special_instructions: string | null;
}

interface SenderInfo {
  phone: string;
  name: string | null;
  isGroup: boolean;
  groupId: string | null;
  groupName: string | null;
}

// Verify Meta webhook signature
async function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false;
  
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    const expectedSignature = "sha256=" + Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

// Extract sender information from WhatsApp payload
function extractSenderInfo(value: any, message: any): SenderInfo {
  const senderPhone = message.from || "";
  
  // Get sender name from contacts array in the webhook payload
  let senderName: string | null = null;
  const contacts = value?.contacts || [];
  for (const contact of contacts) {
    if (contact.wa_id === senderPhone || contact.wa_id === senderPhone.replace(/^91/, "")) {
      senderName = contact.profile?.name || null;
      break;
    }
  }
  
  // Check if message is from a group
  // Group messages have a "group_id" or the context contains group info
  const isGroup = !!message.context?.group_id || !!message.group_id;
  const groupId = message.context?.group_id || message.group_id || null;
  
  // Group name would be in metadata or needs separate API call
  // For now, we'll try to extract from payload if available
  const groupName = value?.metadata?.display_phone_number ? null : null; // Placeholder
  
  console.log("Extracted sender info:", { senderPhone, senderName, isGroup, groupId });
  
  return {
    phone: senderPhone,
    name: senderName,
    isGroup,
    groupId,
    groupName,
  };
}

// Parse message using Lovable AI with enhanced instruction separation
async function parseMessageWithAI(message: string): Promise<{ parsed: ParsedLead; confidence: number }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: PARSING_PROMPT },
        { role: "user", content: message },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_lead_data",
            description: "Extract structured lead data from the message, separating address from special instructions",
            parameters: {
              type: "object",
              properties: {
                customer_name: { type: "string", description: "Customer's name" },
                customer_phone: { type: "string", description: "10-digit phone number" },
                location_address: { 
                  type: "string", 
                  description: "ONLY address: building, street, area, city, PIN. NO time or instructions." 
                },
                service_type: { 
                  type: "string", 
                  enum: ["rent_agreement", "maha_eseva", "domicile", "other"],
                  description: "Type of service needed"
                },
                special_instructions: { 
                  type: "string", 
                  description: "Time slots, availability, urgency, any non-address info" 
                },
              },
              required: ["location_address"],
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_lead_data" } },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI Gateway error:", response.status, errorText);
    throw new Error(`AI parsing failed: ${response.status}`);
  }

  const data = await response.json();
  
  // Extract tool call result
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error("No tool call in AI response");
  }

  const parsed: ParsedLead = JSON.parse(toolCall.function.arguments);
  
  // Calculate confidence based on fields extracted
  let fieldsFound = 0;
  if (parsed.customer_name) fieldsFound++;
  if (parsed.customer_phone) fieldsFound++;
  if (parsed.location_address && parsed.location_address.length > 10) fieldsFound += 1.5; // Address is important
  if (parsed.service_type && parsed.service_type !== "other") fieldsFound++;
  if (parsed.special_instructions) fieldsFound += 0.5; // Bonus for extracting instructions
  
  const confidence = Math.min(100, Math.round((fieldsFound / 4) * 100));

  return { parsed, confidence };
}

// Geocode address using MapTiler
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const MAPTILER_API_KEY = Deno.env.get("MAPTILER_API_KEY");
  
  if (!MAPTILER_API_KEY || !address) {
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address + ", India");
    const response = await fetch(
      `https://api.maptiler.com/geocoding/${encodedAddress}.json?key=${MAPTILER_API_KEY}&limit=1`
    );
    
    if (!response.ok) {
      console.error("Geocoding failed:", response.status);
      return null;
    }

    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
    
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const WHATSAPP_VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
  const WHATSAPP_APP_SECRET = Deno.env.get("WHATSAPP_APP_SECRET");

  // Use service role for database operations
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Handle Meta webhook verification (GET request)
    if (req.method === "GET") {
      const url = new URL(req.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      console.log("Webhook verification request:", { mode, token, hasChallenge: !!challenge });

      if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
        console.log("Webhook verified successfully");
        return new Response(challenge, { status: 200, headers: corsHeaders });
      } else {
        console.error("Webhook verification failed - token mismatch");
        return new Response("Forbidden", { status: 403, headers: corsHeaders });
      }
    }

    // Handle incoming messages (POST request)
    if (req.method === "POST") {
      const body = await req.text();
      const signature = req.headers.get("x-hub-signature-256");

      // Verify signature if app secret is configured
      if (WHATSAPP_APP_SECRET) {
        const isValid = await verifyWebhookSignature(body, signature, WHATSAPP_APP_SECRET);
        if (!isValid) {
          console.error("Invalid webhook signature");
          return new Response("Unauthorized", { status: 401, headers: corsHeaders });
        }
      }

      const payload = JSON.parse(body);
      console.log("Received webhook payload:", JSON.stringify(payload, null, 2));

      // Extract messages from Meta webhook payload
      const entry = payload.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages || [];

      if (messages.length === 0) {
        // This might be a status update, not a message
        console.log("No messages in payload, might be status update");
        return new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const results: Array<{ 
        messageId: string; 
        status: string; 
        leadId?: string; 
        error?: string;
        senderName?: string;
        isGroup?: boolean;
      }> = [];

      for (const message of messages) {
        const messageId = message.id;
        const messageText = message.text?.body || message.button?.text || "";
        const timestamp = message.timestamp;

        // Extract sender info including name and group status
        const senderInfo = extractSenderInfo(value, message);
        
        console.log("Processing message:", { 
          messageId, 
          senderPhone: senderInfo.phone, 
          senderName: senderInfo.name,
          isGroup: senderInfo.isGroup,
          messageText: messageText.substring(0, 100) 
        });

        // Check for duplicate
        const { data: existingLead } = await supabase
          .from("leads")
          .select("id")
          .eq("whatsapp_message_id", messageId)
          .single();

        if (existingLead) {
          console.log("Duplicate message, skipping:", messageId);
          results.push({ messageId, status: "duplicate", leadId: existingLead.id });
          continue;
        }

        // Skip if no message text
        if (!messageText) {
          console.log("Empty message, skipping:", messageId);
          results.push({ messageId, status: "skipped", error: "Empty message" });
          continue;
        }

        try {
          // Parse message with enhanced AI
          const { parsed, confidence } = await parseMessageWithAI(messageText);
          console.log("Parsed lead data:", { 
            parsed, 
            confidence,
            addressLength: parsed.location_address?.length,
            hasInstructions: !!parsed.special_instructions
          });

          // Use sender's phone as fallback if no customer phone extracted
          let customerPhone = parsed.customer_phone;
          if (!customerPhone || customerPhone === "null" || customerPhone.length !== 10) {
            // Extract 10-digit phone from sender (remove country code)
            customerPhone = senderInfo.phone.replace(/^91/, "").slice(-10);
            console.log("Using sender phone as customer phone:", customerPhone);
          }

          // Validate final phone number
          if (!customerPhone || customerPhone.length !== 10) {
            console.log("Invalid phone number, skipping");
            results.push({ messageId, status: "skipped", error: "Invalid phone number" });
            continue;
          }

          // IMPORTANT: Skip messages without a valid address
          if (!parsed.location_address || parsed.location_address.trim().length < 5) {
            console.log("No valid address found, skipping message:", messageId);
            results.push({ messageId, status: "skipped", error: "No address found - lead requires address" });
            continue;
          }

          // Geocode address
          let coordinates: { lat: number; lng: number } | null = null;
          if (parsed.location_address) {
            coordinates = await geocodeAddress(parsed.location_address);
            console.log("Geocoded coordinates:", coordinates);
          }

          // Find an admin user to attribute the lead to
          const { data: adminUser } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "admin")
            .limit(1)
            .single();

          if (!adminUser) {
            console.error("No admin user found to attribute lead");
            results.push({ messageId, status: "error", error: "No admin user found" });
            continue;
          }

          // Check auto-approve setting
          const { data: autoApproveSetting } = await supabase
            .from("app_settings")
            .select("value")
            .eq("key", "whatsapp_auto_approve")
            .single();
          
          const autoApproveEnabled = autoApproveSetting?.value?.enabled === true;
          const leadStatus = autoApproveEnabled ? "open" : "pending";
          console.log("Auto-approve setting:", { autoApproveEnabled, leadStatus });

          // Build lead generator name: use WhatsApp profile name or phone
          const leadGeneratorName = senderInfo.name || `+91${senderInfo.phone.replace(/^91/, "")}`;
          
          // Add group context to special instructions if from group
          let enrichedInstructions = parsed.special_instructions || "";
          if (senderInfo.isGroup && senderInfo.groupId) {
            const groupContext = `[From WhatsApp Group${senderInfo.groupName ? `: ${senderInfo.groupName}` : ""}]`;
            enrichedInstructions = enrichedInstructions 
              ? `${groupContext} ${enrichedInstructions}`
              : groupContext;
          }

          // Create lead with enhanced data
          const { data: newLead, error: insertError } = await supabase
            .from("leads")
            .insert({
              created_by_user_id: adminUser.user_id,
              customer_name: parsed.customer_name,
              customer_phone: customerPhone,
              location_address: parsed.location_address,
              location_lat: coordinates?.lat || 0,
              location_long: coordinates?.lng || 0,
              service_type: parsed.service_type || "other",
              special_instructions: enrichedInstructions || null,
              lead_generator_phone: senderInfo.phone.replace(/^91/, ""),
              lead_generator_name: leadGeneratorName, // Store sender's WhatsApp name
              status: leadStatus,
              source: senderInfo.isGroup ? "whatsapp_group" : "whatsapp",
              whatsapp_message_id: messageId,
              whatsapp_group_id: senderInfo.groupId, // Store group ID if applicable
              import_confidence: confidence,
              raw_message: messageText,
            })
            .select("id")
            .single();

          if (insertError) {
            console.error("Error inserting lead:", insertError);
            results.push({ messageId, status: "error", error: insertError.message });
            continue;
          }

          console.log("Lead created successfully:", { 
            leadId: newLead.id, 
            senderName: senderInfo.name,
            isGroup: senderInfo.isGroup,
            hasSpecialInstructions: !!enrichedInstructions
          });
          
          results.push({ 
            messageId, 
            status: "created", 
            leadId: newLead.id,
            senderName: senderInfo.name || undefined,
            isGroup: senderInfo.isGroup
          });

          // Create notification for admins if confidence is low
          if (confidence < 70) {
            const { data: admins } = await supabase
              .from("user_roles")
              .select("user_id")
              .eq("role", "admin");

            for (const admin of admins || []) {
              await supabase.from("notifications").insert({
                user_id: admin.user_id,
                type: "new_lead",
                title: "New WhatsApp Lead (Low Confidence)",
                body: `A new lead was imported from ${senderInfo.isGroup ? "WhatsApp Group" : "WhatsApp"} by ${leadGeneratorName} with ${confidence}% confidence. Please review.`,
                data: { leadId: newLead.id, confidence, senderName: senderInfo.name },
              });
            }
          }
        } catch (parseError) {
          console.error("Error processing message:", parseError);
          results.push({ 
            messageId, 
            status: "error", 
            error: parseError instanceof Error ? parseError.message : "Unknown error" 
          });
        }
      }

      return new Response(JSON.stringify({ status: "ok", results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
