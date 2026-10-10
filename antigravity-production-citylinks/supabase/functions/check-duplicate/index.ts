import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { entity_type, field, value, exclude_user_id } = await req.json();

    if (!entity_type || !field || !value) {
      return new Response(JSON.stringify({ exists: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let exists = false;
    const trimmedValue = value.trim().toUpperCase();

    if (entity_type === "merchant") {
      let query = supabase.from("merchants").select("id, user_id").ilike(field, trimmedValue);
      if (exclude_user_id) query = query.neq("user_id", exclude_user_id);
      const { data } = await query.limit(1);
      exists = (data && data.length > 0) || false;
    } else if (entity_type === "labor") {
      let query = supabase.from("labor_profiles").select("id, user_id").ilike(field, trimmedValue);
      if (exclude_user_id) query = query.neq("user_id", exclude_user_id);
      const { data } = await query.limit(1);
      exists = (data && data.length > 0) || false;
    } else if (entity_type === "transporter") {
      let query = supabase.from("transporters").select("id, user_id").ilike(field, trimmedValue);
      if (exclude_user_id) query = query.neq("user_id", exclude_user_id);
      const { data } = await query.limit(1);
      exists = (data && data.length > 0) || false;
    } else if (entity_type === "profile") {
      let query = supabase.from("profiles").select("id").ilike(field, trimmedValue);
      if (exclude_user_id) query = query.neq("id", exclude_user_id);
      const { data } = await query.limit(1);
      exists = (data && data.length > 0) || false;
    }

    return new Response(
      JSON.stringify({ exists, field, value: trimmedValue }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
