import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PHONEPE_SALT_KEY = Deno.env.get("PHONEPE_SALT_KEY");
    const PHONEPE_SALT_INDEX = Deno.env.get("PHONEPE_SALT_INDEX") || "1";
    const PHONEPE_MERCHANT_ID = Deno.env.get("PHONEPE_MERCHANT_ID");

    if (!PHONEPE_SALT_KEY || !PHONEPE_MERCHANT_ID) {
      return new Response(
        JSON.stringify({ success: false, error: "Payment gateway not configured" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const PHONEPE_HOST = Deno.env.get("PHONEPE_ENV") === "production"
      ? "https://api.phonepe.com/apis/hermes"
      : "https://api-preprod.phonepe.com/apis/pg-sandbox";

    const body = await req.json();
    const { transactionId } = body;

    if (!transactionId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing transactionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify checksum for status API
    const statusEndpoint = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${transactionId}`;
    const encoder = new TextEncoder();
    const hashData = encoder.encode(statusEndpoint + PHONEPE_SALT_KEY);
    const hashBuffer = await crypto.subtle.digest("SHA-256", hashData);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256Hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    const checksum = sha256Hash + "###" + PHONEPE_SALT_INDEX;

    const response = await fetch(`${PHONEPE_HOST}${statusEndpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": PHONEPE_MERCHANT_ID,
      },
    });

    const data = await response.json();

    // Update order status if payment is complete
    if (data.success && data.code === "PAYMENT_SUCCESS") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceKey);

      // Extract order_id from transactionId (format: CL_{orderId}_{timestamp})
      const parts = transactionId.split("_");
      if (parts.length >= 2) {
        const orderId = parts[1];
        await supabase
          .from("orders")
          .update({ status: "confirmed" })
          .eq("id", orderId);

        await supabase.from("audit_logs").insert({
          action: "payment_completed",
          entity_type: "order",
          entity_id: orderId,
          details: {
            transaction_id: transactionId,
            payment_code: data.code,
            gateway: "phonepe",
          },
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: data.success,
        payment_status: data.code,
        data: {
          state: data.data?.state,
          amount: data.data?.amount ? data.data.amount / 100 : null,
          paymentInstrument: data.data?.paymentInstrument,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Payment callback error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
