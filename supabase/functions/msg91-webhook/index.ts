import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseMessageWithAI, geocodeAddress, extractValidPhone, type ParsedLead } from "../_shared/lead-parser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, authkey",
};

// MSG91 webhook payload structure (actual format from MSG91)
interface MSG91InboundPayload {
  sender?: string;              // Sender's phone number
  text?: string;                // Direct text content (primary field)
  message?: string;             // Fallback message field
  content?: string;             // Another possible content field
  customer_name?: string;       // Sender's name from MSG91
  integrated_number?: string;   // Your MSG91 WhatsApp number
  company_id?: number;
  content_type?: string;
  received_at?: string;         // Timestamp
  message_uuid?: string;        // Unique message ID for deduplication
  direction?: number;
  contacts?: Array<{
    profile: { name: string };
    wa_id: string;
  }>;
  messages?: Array<{
    from: string;
    id: string;
    timestamp?: string;
    text?: { body: string };
    type: string;
  }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const MSG91_AUTH_KEY = Deno.env.get("MSG91_AUTH_KEY");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Optional: Verify MSG91 auth key from header
    const authKey = req.headers.get("authkey");
    if (MSG91_AUTH_KEY && authKey && authKey !== MSG91_AUTH_KEY) {
      console.error("Invalid MSG91 auth key");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const payload: MSG91InboundPayload = await req.json();
    console.log("MSG91 webhook payload:", JSON.stringify(payload, null, 2));

    // Extract message content from various possible fields
    const messageContent = 
      payload.text ||                              // Direct text field (primary)
      payload.message ||                           // Standard message field
      payload.content ||                           // Content field
      payload.messages?.[0]?.text?.body ||         // Nested in messages array
      "";

    // Extract sender phone from various possible fields
    const senderPhone = 
      payload.sender || 
      payload.messages?.[0]?.from ||
      payload.contacts?.[0]?.wa_id ||
      "";

    // Extract sender name
    const senderName = 
      payload.customer_name ||
      payload.contacts?.[0]?.profile?.name ||
      null;

    // Skip empty messages
    if (!messageContent || messageContent.trim().length === 0) {
      console.log("Empty message, skipping");
      return new Response(JSON.stringify({ status: "skipped", reason: "empty_message" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate a unique message ID for deduplication
    const messageId = payload.message_uuid || 
      payload.messages?.[0]?.id ||
      `msg91_${senderPhone}_${payload.received_at || Date.now()}`;

    // Check for duplicate
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("whatsapp_message_id", messageId)
      .single();

    if (existingLead) {
      console.log("Duplicate message, skipping:", messageId);
      return new Response(JSON.stringify({ status: "duplicate", leadId: existingLead.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse message with AI
    const { parsed, confidence } = await parseMessageWithAI(messageContent);
    console.log("Parsed lead data:", { parsed, confidence });

    // Extract valid customer phone
    const customerPhone = extractValidPhone(parsed.customer_phone, senderPhone);
    if (!customerPhone) {
      console.log("Invalid phone number, skipping");
      return new Response(JSON.stringify({ status: "skipped", reason: "invalid_phone" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip messages without valid address
    if (!parsed.location_address || parsed.location_address.trim().length < 5) {
      console.log("No valid address found, skipping");
      return new Response(JSON.stringify({ status: "skipped", reason: "no_address" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Geocode address
    const coordinates = await geocodeAddress(parsed.location_address);
    console.log("Geocoded coordinates:", coordinates);

    // Find admin user for attribution
    const { data: adminUser } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .single();

    if (!adminUser) {
      console.error("No admin user found");
      return new Response(JSON.stringify({ status: "error", reason: "no_admin" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check auto-approve setting
    const { data: autoApproveSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "whatsapp_auto_approve")
      .single();

    const autoApproveEnabled = autoApproveSetting?.value?.enabled === true;
    const leadStatus = autoApproveEnabled ? "open" : "pending";

    // Build lead generator name
    const senderPhoneClean = senderPhone.replace(/^91/, "");
    const leadGeneratorName = senderName || `+91${senderPhoneClean}`;

    // Create lead
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
        special_instructions: parsed.special_instructions || null,
        lead_generator_phone: senderPhoneClean,
        lead_generator_name: leadGeneratorName,
        status: leadStatus,
        source: "msg91",
        whatsapp_message_id: messageId,
        import_confidence: confidence,
        raw_message: messageContent,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error inserting lead:", insertError);
      return new Response(JSON.stringify({ status: "error", reason: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("MSG91 lead created:", { leadId: newLead.id, confidence, senderName: leadGeneratorName });

    // Trigger WhatsApp notifications to nearby users (fire and forget)
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    fetch(`${SUPABASE_URL}/functions/v1/send-lead-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        lead_id: newLead.id,
        lead_lat: coordinates?.lat || 0,
        lead_long: coordinates?.lng || 0,
        service_type: parsed.service_type || "other",
        location_address: parsed.location_address,
      }),
    }).then(async (res) => {
      const data = await res.json();
      console.log("Lead notifications sent:", data);
    }).catch((err) => {
      console.error("Error sending lead notifications:", err);
    });

    // Create notification for admins if low confidence
    if (confidence < 70) {
      await supabase.from("notifications").insert({
        user_id: adminUser.user_id,
        type: "lead_low_confidence",
        title: "MSG91 Lead Needs Review",
        message: `New lead from ${leadGeneratorName} has ${confidence}% parsing confidence`,
        data: { lead_id: newLead.id, confidence, source: "msg91" },
      });
    }

    return new Response(
      JSON.stringify({
        status: "success",
        leadId: newLead.id,
        confidence,
        source: "msg91",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("MSG91 webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ status: "error", message: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
