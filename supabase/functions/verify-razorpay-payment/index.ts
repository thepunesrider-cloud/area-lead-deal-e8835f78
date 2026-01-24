import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, razorpay_subscription_id } = await req.json();

    // Verify signature - format differs for subscription vs order
    let text: string;
    if (razorpay_subscription_id) {
      // For subscriptions: subscription_id|payment_id
      text = `${razorpay_subscription_id}|${razorpay_payment_id}`;
    } else {
      // For orders: order_id|payment_id
      text = `${razorpay_order_id}|${razorpay_payment_id}`;
    }
    const expectedSignature = await hmacSha256(RAZORPAY_KEY_SECRET, text);

    if (razorpay_signature !== expectedSignature) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update payment record - find by subscription_id or order_id
    const gatewayOrderId = razorpay_subscription_id || razorpay_order_id;
    await supabaseClient
      .from("payments")
      .update({
        status: "completed",
        gateway_transaction_id: razorpay_payment_id,
        updated_at: new Date().toISOString(),
      })
      .eq("gateway_order_id", gatewayOrderId);

    // Calculate expiry (30 days from now)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    // Update user subscription using service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabaseAdmin
      .from("profiles")
      .update({
        is_subscribed: true,
        subscription_expires_at: expiryDate.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    // Create notification
    await supabaseAdmin.from("notifications").insert({
      user_id: user.id,
      type: "subscription",
      title: "Subscription Activated! 🎉",
      body: `Your premium subscription is now active until ${expiryDate.toLocaleDateString()}`,
      data: { expires_at: expiryDate.toISOString() },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        expires_at: expiryDate.toISOString(),
        message: "Subscription activated successfully!" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
