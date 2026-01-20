import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseMessageWithAI, geocodeAddress, extractValidPhone } from "../_shared/lead-parser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Expected auth key (should match whatsapp-bot/.env AUTH_KEY)
const EXPECTED_AUTH_KEY = Deno.env.get("WHATSAPP_BOT_AUTH_KEY") || "leadx_bot_secret_2024";

interface BotPayload {
  source: string;
  message_id: string;
  timestamp: number;
  message: string;
  sender_phone: string;
  sender_name: string | null;
  group_id: string;
  group_name: string;
  is_forwarded: boolean;
  quoted_message: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    if (token !== EXPECTED_AUTH_KEY) {
      console.error("Invalid auth key");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse payload
    const payload: BotPayload = await req.json();
    console.log("WhatsApp Group Bot payload:", JSON.stringify(payload, null, 2));

    const { message_id, message, sender_phone, sender_name, group_id, group_name, is_forwarded } = payload;

    // Skip empty messages
    if (!message || message.trim().length === 0) {
      console.log("Empty message, skipping");
      return new Response(JSON.stringify({ status: "skipped", reason: "empty_message" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate using message_id
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id")
      .eq("whatsapp_message_id", message_id)
      .maybeSingle();

    if (existingLead) {
      console.log("Duplicate message, skipping:", message_id);
      return new Response(JSON.stringify({ status: "skipped", reason: "duplicate" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse message with AI
    const { parsed, confidence } = await parseMessageWithAI(message);
    console.log("Parsed lead data:", { parsed, confidence });

    // Extract valid customer phone (from message or sender)
    const customerPhone = extractValidPhone(parsed.customer_phone, sender_phone);
    if (!customerPhone) {
      console.log("No valid phone number found, skipping");
      return new Response(JSON.stringify({ status: "skipped", reason: "no_phone" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Skip messages without address (minimum 5 characters)
    if (!parsed.location_address || parsed.location_address.length < 5) {
      console.log("No valid address found, skipping");
      return new Response(JSON.stringify({ status: "skipped", reason: "no_address" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Geocode address
    const coordinates = await geocodeAddress(parsed.location_address);
    console.log("Geocoded coordinates:", coordinates);

    // Get admin user for attribution
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    const createdByUserId = adminRole?.user_id;
    if (!createdByUserId) {
      console.error("No admin user found to attribute lead to");
      return new Response(JSON.stringify({ error: "No admin user found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check auto-approve setting
    const { data: autoApproveSetting } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "whatsapp_auto_approve")
      .maybeSingle();

    const autoApproveEnabled = autoApproveSetting?.value === true;
    const leadStatus = autoApproveEnabled ? "open" : "pending";

    // Determine source tag
    const sourceTag = is_forwarded ? "whatsapp_bot_forwarded" : "whatsapp_bot";

    // Build lead generator name
    const leadGeneratorName = sender_name || (sender_phone ? `+91${sender_phone.replace(/^91/, "")}` : "Unknown");

    // Create lead
    const { data: newLead, error: insertError } = await supabase
      .from("leads")
      .insert({
        customer_name: parsed.customer_name || null,
        customer_phone: customerPhone,
        location_address: parsed.location_address,
        location_lat: coordinates?.lat || 19.076, // Default Mumbai
        location_long: coordinates?.lng || 72.8777,
        service_type: parsed.service_type || "other",
        special_instructions: parsed.special_instructions || null,
        created_by_user_id: createdByUserId,
        status: leadStatus,
        lead_generator_name: leadGeneratorName,
        lead_generator_phone: sender_phone || null,
        source: sourceTag,
        whatsapp_message_id: message_id,
        whatsapp_group_id: group_id,
        import_confidence: confidence,
        raw_message: message,
        notes: `Auto-imported from WhatsApp group: ${group_name}`,
      })
      .select("id, lead_code")
      .single();

    if (insertError) {
      console.error("Error creating lead:", insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Lead created successfully:", newLead);

    // Create notification for admins if low confidence
    if (confidence < 70) {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin) => ({
          user_id: admin.user_id,
          title: "Low Confidence Lead Import",
          body: `Lead ${newLead.lead_code} from WhatsApp bot has ${confidence}% confidence. Please review.`,
          type: "lead_import",
          data: { lead_id: newLead.id, confidence, source: sourceTag },
        }));

        await supabase.from("notifications").insert(notifications);
      }
    }

    return new Response(
      JSON.stringify({
        status: "success",
        lead_id: newLead.id,
        lead_code: newLead.lead_code,
        confidence,
        lead_status: leadStatus,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
