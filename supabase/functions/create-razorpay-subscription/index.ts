import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allow both production and localhost for dev
const allowedOrigins = [
  "https://leadsnearby.in",
  "http://localhost:8081",
  "http://localhost:8080"
];

function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };
}

const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

// Plan ID for ₹499/30 days subscription - Create this in Razorpay Dashboard
// Go to Dashboard → Subscriptions → Plans → Create Plan
// Name: LEADX Monthly, Amount: 49900 paise (₹499), Period: monthly, Interval: 1
const PLAN_ID = Deno.env.get("RAZORPAY_PLAN_ID") || "plan_S7oiCw91zxnV96"; // Replace with your actual plan ID

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
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

    // Check for coupon code in request body
    let couponCode: string | null = null;
    try {
      const body = await req.json();
      couponCode = body?.coupon_code?.toUpperCase() || null;
    } catch {
      // No body or invalid JSON - that's fine, proceed without coupon
    }

    // Handle LEADFREE coupon - 15 days free access
    if (couponCode === "LEADFREE") {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Check if user already used this coupon
      const { data: existingPayment } = await supabaseAdmin
        .from("payments")
        .select("id")
        .eq("user_id", user.id)
        .eq("metadata->>coupon_code", "LEADFREE")
        .maybeSingle();

      if (existingPayment) {
        return new Response(
          JSON.stringify({ error: "You have already used this coupon code." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Calculate 15-day expiry
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 15);

      // Update user subscription
      await supabaseAdmin
        .from("profiles")
        .update({
          is_subscribed: true,
          subscription_expires_at: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      // Create payment record for tracking
      await supabaseAdmin.from("payments").insert({
        user_id: user.id,
        amount: 0,
        currency: "INR",
        status: "completed",
        payment_gateway: "coupon",
        gateway_order_id: `COUPON_LEADFREE_${Date.now()}`,
        metadata: { 
          type: "coupon", 
          coupon_code: "LEADFREE",
          free_days: 15
        },
      });

      // Create notification
      await supabaseAdmin.from("notifications").insert({
        user_id: user.id,
        type: "subscription",
        title: "🎉 Coupon Applied Successfully!",
        body: `You've got 15 days of free premium access until ${expiryDate.toLocaleDateString()}`,
        data: { expires_at: expiryDate.toISOString(), coupon_code: "LEADFREE" },
      });

      return new Response(
        JSON.stringify({
          type: "coupon-applied",
          message: "Congratulations! You've got 15 days of free premium access!",
          expires_at: expiryDate.toISOString(),
          free_days: 15,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Invalid coupon code
    if (couponCode && couponCode !== "LEADFREE") {
      return new Response(
        JSON.stringify({ error: "Invalid coupon code. Please check and try again." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // // Get user profile
    // const { data: profile } = await supabaseClient
    //   .from("profiles")
    //   .select("name, phone")
    //   .eq("id", user.id)
    //   .single();

    // const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    // // Try to create subscription first
    // console.log("Creating subscription with plan:", PLAN_ID);
    // 
    // const subscriptionResponse = await fetch("https://api.razorpay.com/v1/subscriptions", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Basic ${auth}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     plan_id: PLAN_ID,
    //     total_count: 12, // 12 billing cycles (12 months)
    //     quantity: 1,
    //     customer_notify: 1,
    //     notes: {
    //       user_id: user.id,
    //       email: user.email,
    //       name: profile?.name || "LEADX User",
    //     },
    //   }),
    // });

    // const subscriptionText = await subscriptionResponse.text();
    // console.log("Subscription response:", subscriptionResponse.status, subscriptionText);

    // if (subscriptionResponse.ok) {
    //   const subscription = JSON.parse(subscriptionText);

    //   // Create payment record for subscription
    //   await supabaseClient.from("payments").insert({
    //     user_id: user.id,
    //     amount: 49900, // ₹499 in paise
    //     currency: "INR",
    //     status: "pending",
    //     payment_gateway: "razorpay",
    //     gateway_order_id: subscription.id,
    //     metadata: { 
    //       type: "subscription", 
    //       subscription_id: subscription.id,
    //       plan_id: PLAN_ID
    //     },
    //   });

    //   return new Response(
    //     JSON.stringify({
    //       type: "subscription",
    //       subscription_id: subscription.id,
    //       key_id: RAZORPAY_KEY_ID,
    //       name: profile?.name || "LEADX User",
    //       email: user.email,
    //       phone: profile?.phone || "",
    //     }),
    //     { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    //   );
    // }

    // // If subscription fails, fall back to one-time order payment
    // console.log("Subscription failed, falling back to order:", subscriptionText);

    // const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Basic ${auth}`,
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     amount: 49900, // ₹499 in paise
    //     currency: "INR",
    //     receipt: `lx_${user.id.slice(0, 8)}_${Date.now().toString(36)}`,
    //     notes: {
    //       user_id: user.id,
    //       type: "subscription_fallback",
    //       email: user.email,
    //     },
    //   }),
    // });

    // await supabaseClient.from("payments").insert({
    //   user_id: user.id,
    //   amount: 49900,
    //   currency: "INR",
    //   status: "pending",
    //   payment_gateway: "razorpay",
    //   metadata: { type: "one_time" },
    // });

    // return new Response(
    //   JSON.stringify({
    //     type: "order",
    //     order_id: order.id,
    //     amount: order.amount,
    //     currency: order.currency,
    //     key_id: RAZORPAY_KEY_ID,
    //     name: profile?.name || "LEADX User",
    //     email: user.email,
    //     phone: profile?.phone || "",
    //   }),
    //   { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    // );

    // --- FREE SUBSCRIPTION RESPONSE ---
    return new Response(
      JSON.stringify({
        type: "free-subscription",
        message: "You are our lucky user and you're getting the LeadsNearby Premium Subscription for FREE!",
        note: "This subscription is only valid for a limited time.",
        // original_price: 499, // ₹499 (crossed out in UI)
        // You may want to add more fields as needed for your frontend
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
