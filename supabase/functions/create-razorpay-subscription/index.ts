import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

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

    // Create Razorpay subscription
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    
    // First, create or get plan (₹500/month)
    const planId = "plan_leadx_monthly"; // You'll need to create this in Razorpay dashboard
    
    // Create subscription with autopay
    const subscriptionResponse = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        plan_id: planId,
        total_count: 12, // 12 months
        quantity: 1,
        customer_notify: 1,
        notes: {
          user_id: user.id,
          email: user.email,
        },
      }),
    });

    if (!subscriptionResponse.ok) {
      // If subscription creation fails, fall back to one-time payment
      const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: 50000, // ₹500 in paisa
          currency: "INR",
          receipt: `leadx_${user.id}_${Date.now()}`,
          notes: {
            user_id: user.id,
            type: "subscription",
          },
        }),
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error("Razorpay order error:", errorText);
        throw new Error("Failed to create Razorpay order");
      }

      const order = await orderResponse.json();

      // Create payment record
      await supabaseClient.from("payments").insert({
        user_id: user.id,
        amount: 50000,
        currency: "INR",
        status: "pending",
        payment_gateway: "razorpay",
        gateway_order_id: order.id,
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
    }

    const subscription = await subscriptionResponse.json();

    // Create payment record for subscription
    await supabaseClient.from("payments").insert({
      user_id: user.id,
      amount: 50000,
      currency: "INR",
      status: "pending",
      payment_gateway: "razorpay",
      gateway_order_id: subscription.id,
      metadata: { type: "subscription", subscription_id: subscription.id },
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
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
