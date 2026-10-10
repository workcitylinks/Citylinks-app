import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// PhonePe PG integration
// Docs: https://developer.phonepe.com/v1/reference/pay-api
const PHONEPE_HOST = Deno.env.get("PHONEPE_ENV") === "production"
  ? "https://api.phonepe.com/apis/hermes"
  : "https://api-preprod.phonepe.com/apis/pg-sandbox";

function generateChecksum(payload: string, saltKey: string, saltIndex: string): string {
  // SHA256(base64EncodedPayload + "/pg/v1/pay" + saltKey) + "###" + saltIndex
  const encoder = new TextEncoder();
  const data = encoder.encode(payload + "/pg/v1/pay" + saltKey);
  // Use Web Crypto API
  return ""; // Computed in the handler below
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PHONEPE_MERCHANT_ID = Deno.env.get("PHONEPE_MERCHANT_ID");
    const PHONEPE_SALT_KEY = Deno.env.get("PHONEPE_SALT_KEY");
    const PHONEPE_SALT_INDEX = Deno.env.get("PHONEPE_SALT_INDEX") || "1";

    if (!PHONEPE_MERCHANT_ID || !PHONEPE_SALT_KEY) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment gateway not configured. PhonePe credentials are missing.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { order_id, amount, customer_phone, redirect_url } = body;

    if (!order_id || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid order_id or amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transactionId = `CL_${order_id}_${Date.now()}`;
    const amountInPaise = Math.round(amount * 100);

    const payloadObj = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId: transactionId,
      merchantUserId: user.id.replace(/-/g, "").substring(0, 36),
      amount: amountInPaise,
      redirectUrl: redirect_url || `${req.headers.get("origin") || "https://citylinks.lovable.app"}/orders`,
      redirectMode: "REDIRECT",
      callbackUrl: `${supabaseUrl}/functions/v1/payment-callback`,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };

    if (customer_phone) {
      (payloadObj as any).mobileNumber = customer_phone;
    }

    const payloadString = JSON.stringify(payloadObj);
    const base64Payload = btoa(payloadString);

    // Generate SHA256 checksum
    const encoder = new TextEncoder();
    const hashData = encoder.encode(base64Payload + "/pg/v1/pay" + PHONEPE_SALT_KEY);
    const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256Hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    const checksum = sha256Hash + "###" + PHONEPE_SALT_INDEX;

    // Call PhonePe API
    const phonePeResponse = await fetch(`${PHONEPE_HOST}/pg/v1/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
      },
      body: JSON.stringify({ request: base64Payload }),
    });

    const phonePeData = await phonePeResponse.json();

    if (!phonePeResponse.ok || !phonePeData.success) {
      console.error("PhonePe API error:", JSON.stringify(phonePeData));
      return new Response(
        JSON.stringify({
          success: false,
          error: phonePeData.message || "Payment initiation failed",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store transaction reference
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: "payment_initiated",
      entity_type: "order",
      entity_id: order_id,
      details: {
        transaction_id: transactionId,
        amount,
        gateway: "phonepe",
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          transaction_id: transactionId,
          payment_url: phonePeData.data?.instrumentResponse?.redirectInfo?.url,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Payment error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
