import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is an employee using user-context client
    const userClient = createClient(supabaseUrl, anonKey!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service role client - bypasses RLS
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check employee role
    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'employee');
    if (!roleData?.length) {
      return new Response(JSON.stringify({ error: 'Only employees can create users' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, password, full_name, role, business_name, business_type, phone } = await req.json();

    if (!email || !password || !full_name || !role) {
      return new Response(JSON.stringify({ error: 'Email, password, full name, and role are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create user via admin API (bypasses signup restrictions)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      console.error('Create user error:', createError.message);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = newUser.user.id;

    // Update profile to approved
    const { error: profileError } = await adminClient.from('profiles').update({
      full_name,
      account_status: 'approved',
      phone,
    }).eq('id', userId);
    
    if (profileError) {
      console.error('Profile update error:', profileError.message);
    }

    // Assign role
    const { error: roleError } = await adminClient.from('user_roles').upsert(
      { user_id: userId, role },
      { onConflict: 'user_id,role' }
    );
    
    if (roleError) {
      console.error('Role assign error:', roleError.message);
    }

    // Create merchant record if applicable
    if (role === 'merchant' && business_name) {
      const { error: merchantError } = await adminClient.from('merchants').insert({
        user_id: userId,
        business_name,
        business_type: business_type || 'retail',
        phone,
        email,
        approval_status: 'approved',
        approved_by: caller.id,
        approved_at: new Date().toISOString(),
        onboarding_complete: true,
        onboarding_step: 4,
      });
      if (merchantError) {
        console.error('Merchant insert error:', merchantError.message);
        return new Response(JSON.stringify({ error: 'User created but merchant record failed: ' + merchantError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Create labor profile if applicable
    if (role === 'labor') {
      const { error: laborError } = await adminClient.from('labor_profiles').insert({
        user_id: userId,
        full_name,
        phone,
        email,
        approval_status: 'approved',
        approved_by: caller.id,
        approved_at: new Date().toISOString(),
      });
      if (laborError) {
        console.error('Labor insert error:', laborError.message);
      }
    }

    // Create transporter record if applicable
    if (role === 'transportation') {
      const { error: transportError } = await adminClient.from('transporters').insert({
        user_id: userId,
        full_name,
        phone,
        email,
        approval_status: 'approved',
        approved_by: caller.id,
        approved_at: new Date().toISOString(),
      });
      if (transportError) {
        console.error('Transport insert error:', transportError.message);
      }
    }

    return new Response(JSON.stringify({ success: true, user_id: userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('Unexpected error:', e.message);
    return new Response(JSON.stringify({ error: e.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
