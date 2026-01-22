import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadNotificationPayload {
  lead_id: string;
  lead_lat: number;
  lead_long: number;
  service_type: string;
  location_address: string;
}

// Calculate distance between two points in kilometers (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Send WhatsApp message via MSG91
async function sendWhatsAppMessage(
  phone: string,
  templateName: string,
  integratedNumber: string,
  authKey: string,
  bodyParams: string[],
  buttonSuffix?: string
): Promise<boolean> {
  try {
    // Format phone number for MSG91 (ensure 91 prefix for India)
    const formattedPhone = phone.startsWith("91") ? phone : `91${phone.replace(/^0+/, "")}`;
    
    // Build components object for MSG91 template - matches their exact format
    const componentsObj: Record<string, { type: string; value: string; subtype?: string }> = {};
    
    // Add body parameters if any (body_1, body_2, etc.)
    bodyParams.forEach((value, index) => {
      componentsObj[`body_${index + 1}`] = { type: "text", value };
    });
    
    // Add button parameter if provided
    if (buttonSuffix) {
      componentsObj["button_1"] = { type: "text", subtype: "url", value: buttonSuffix };
    }
    
    // MSG91 bulk API format with to_and_components inside language
    const payload = {
      integrated_number: integratedNumber,
      content_type: "template",
      payload: {
        messaging_product: "whatsapp",
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "en",
            policy: "deterministic",
            to_and_components: [
              {
                to: [formattedPhone],
                components: componentsObj
              }
            ]
          }
        }
      },
    };

    console.log("Sending WhatsApp notification to:", formattedPhone);
    console.log("MSG91 Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(
      "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authkey: authKey,
        },
        body: JSON.stringify(payload),
      }
    );

    const result = await response.json();
    console.log("MSG91 response:", result);

    return response.ok && result.status !== "fail";
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const MSG91_AUTH_KEY = Deno.env.get("MSG91_AUTH_KEY");
  const MSG91_INTEGRATED_NUMBER = Deno.env.get("MSG91_INTEGRATED_NUMBER");
  const MSG91_NEW_LEAD_TEMPLATE = Deno.env.get("MSG91_NEW_LEAD_TEMPLATE");
  const SITE_URL = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "https://area-lead-deal.lovable.app";

  if (!MSG91_AUTH_KEY || !MSG91_INTEGRATED_NUMBER || !MSG91_NEW_LEAD_TEMPLATE) {
    console.error("Missing MSG91 configuration");
    return new Response(
      JSON.stringify({ error: "MSG91 not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const payload: LeadNotificationPayload = await req.json();
    console.log("Lead notification payload:", payload);

    const { lead_id, lead_lat, lead_long, service_type, location_address } = payload;

    if (!lead_id || lead_lat === undefined || lead_long === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all users with valid location and phone
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("id, name, phone, location_lat, location_long, service_radius_km")
      .not("phone", "is", null)
      .not("location_lat", "is", null)
      .not("location_long", "is", null);

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${users?.length || 0} users with location and phone`);

    // Filter users within their service radius of the lead
    const eligibleUsers = (users || []).filter((user) => {
      if (!user.location_lat || !user.location_long || !user.phone) return false;
      
      const distance = calculateDistance(
        lead_lat,
        lead_long,
        user.location_lat,
        user.location_long
      );
      
      const serviceRadius = user.service_radius_km || 10; // Default 10km
      const isWithinRadius = distance <= serviceRadius;
      
      console.log(`User ${user.name || user.id}: distance=${distance.toFixed(2)}km, radius=${serviceRadius}km, eligible=${isWithinRadius}`);
      
      return isWithinRadius;
    });

    console.log(`${eligibleUsers.length} users eligible for notification`);

    // Format service type for display
    const serviceTypeDisplay = service_type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c: string) => c.toUpperCase());

    // Truncate address if too long
    const shortAddress = location_address && location_address.length > 50 
      ? location_address.substring(0, 47) + "..." 
      : location_address || "Unknown location";

    // Build claim URL
    const claimUrl = `https://area-lead-deal.lovable.app/lead/${lead_id}`;

    // Send notifications to all eligible users
    const notificationResults = await Promise.allSettled(
      eligibleUsers.map(async (user) => {
        // Body parameters for template - should match {{1}}, {{2}} etc in your template
        const bodyParams = [serviceTypeDisplay, shortAddress];
        
        // Button URL suffix (for dynamic URL button) - the lead ID
        const buttonSuffix = lead_id;

        const sent = await sendWhatsAppMessage(
          user.phone!,
          MSG91_NEW_LEAD_TEMPLATE,
          MSG91_INTEGRATED_NUMBER,
          MSG91_AUTH_KEY,
          bodyParams,
          buttonSuffix
        );

        // Also create in-app notification
        await supabase.from("notifications").insert({
          user_id: user.id,
          type: "new_lead",
          title: `New ${serviceTypeDisplay} Lead!`,
          body: `A new lead is available in your area: ${shortAddress}`,
          data: { lead_id, service_type, claim_url: claimUrl },
        });

        return { userId: user.id, phone: user.phone, sent };
      })
    );

    const successCount = notificationResults.filter(
      (r) => r.status === "fulfilled" && (r.value as { sent: boolean }).sent
    ).length;

    console.log(`Sent ${successCount}/${eligibleUsers.length} WhatsApp notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        eligible_users: eligibleUsers.length,
        notifications_sent: successCount,
        lead_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-lead-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
