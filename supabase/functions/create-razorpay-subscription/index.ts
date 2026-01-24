import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

// Plan ID for ₹499/30 days subscription - Create this in Razorpay Dashboard
// Go to Dashboard → Subscriptions → Plans → Create Plan
// Name: LEADX Monthly, Amount: 49900 paise (₹499), Period: monthly, Interval: 1
const PLAN_ID = Deno.env.get("RAZORPAY_PLAN_ID") || "plan_PzXXXXXXXXXXXX"; // Replace with your actual plan ID

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

    // Get user profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("name, phone")
      .eq("id", user.id)
      .single();

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    // Try to create subscription first
    console.log("Creating subscription with plan:", PLAN_ID);
    
    const subscriptionResponse = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: PLAN_ID,
        total_count: 12, // 12 billing cycles (12 months)
        quantity: 1,
        customer_notify: 1,
        notes: {
          user_id: user.id,
          email: user.email,
          name: profile?.name || "LEADX User",
        },
      }),
    });

    const subscriptionText = await subscriptionResponse.text();
    console.log("Subscription response:", subscriptionResponse.status, subscriptionText);

    if (subscriptionResponse.ok) {
      const subscription = JSON.parse(subscriptionText);

      // Create payment record for subscription
      await supabaseClient.from("payments").insert({
        user_id: user.id,
        amount: 49900, // ₹499 in paise
        currency: "INR",
        status: "pending",
        payment_gateway: "razorpay",
        gateway_order_id: subscription.id,
        metadata: { 
          type: "subscription", 
          subscription_id: subscription.id,
          plan_id: PLAN_ID
        },
      });

      return new Response(
        JSON.stringify({
          type: "subscription",
          subscription_id: subscription.id,
          key_id: RAZORPAY_KEY_ID,
          name: profile?.name || "LEADX User",
          email: user.email,
          phone: profile?.phone || "",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If subscription fails, fall back to one-time order payment
    console.log("Subscription failed, falling back to order:", subscriptionText);

    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: 49900, // ₹499 in paise
        currency: "INR",
        receipt: `lx_${user.id.slice(0, 8)}_${Date.now().toString(36)}`,
        notes: {
          user_id: user.id,
          type: "subscription_fallback",
          email: user.email,
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error("Razorpay order error:", errorText);
      throw new Error("Failed to create Razorpay order: " + errorText);
    }

    const order = await orderResponse.json();

    // Create payment record
    await supabaseClient.from("payments").insert({
      user_id: user.id,
      amount: 49900,
      currency: "INR",
      status: "pending",
      payment_gateway: "razorpay",
      gateway_order_id: order.id,
      metadata: { type: "one_time" },
    });

    return new Response(
      JSON.stringify({
        type: "order",
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key_id: RAZORPAY_KEY_ID,
        name: profile?.name || "LEADX User",
        email: user.email,
        phone: profile?.phone || "",
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
