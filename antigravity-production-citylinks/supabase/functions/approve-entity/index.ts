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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is an employee
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Not authorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await userClient.from('user_roles').select('role').eq('user_id', caller.id);
    const isEmployee = roleData?.some((r: { role: string }) => r.role === 'employee');
    if (!isEmployee) {
      return new Response(JSON.stringify({ error: 'Forbidden: only employees can perform approvals' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Admin client bypasses RLS for all operations below
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { entity_type, entity_id, user_id, action, reason } = body;
    // entity_type: 'merchant' | 'transporter' | 'user'
    // action: 'approved' | 'rejected'

    const now = new Date().toISOString();

    if (entity_type === 'merchant') {
      const { error } = await adminClient.from('merchants').update({
        approval_status: action,
        approved_by: action === 'approved' ? caller.id : null,
        approved_at: action === 'approved' ? now : null,
      }).eq('id', entity_id);
      if (error) throw new Error(`Merchant update failed: ${error.message}`);

      // Update profile account_status
      const { error: profileError } = await adminClient.from('profiles').update({
        account_status: action,
      }).eq('id', user_id);
      if (profileError) console.error('Profile update error (non-fatal):', profileError.message);

    } else if (entity_type === 'transporter') {
      const { error } = await adminClient.from('transporters').update({
        approval_status: action,
        approved_by: action === 'approved' ? caller.id : null,
        approved_at: action === 'approved' ? now : null,
      }).eq('id', entity_id);
      if (error) throw new Error(`Transporter update failed: ${error.message}`);

      const { error: profileError } = await adminClient.from('profiles').update({
        account_status: action,
      }).eq('id', user_id);
      if (profileError) console.error('Profile update error (non-fatal):', profileError.message);

    } else if (entity_type === 'merchant_change_request') {
      const { data: request, error: reqError } = await adminClient
        .from('merchant_change_requests')
        .select('*')
        .eq('id', entity_id)
        .single();
      
      if (reqError || !request) throw new Error(`Change request not found: ${reqError?.message}`);

      if (action === 'approved') {
        // Apply changes to merchant
        const { error: updateError } = await adminClient
          .from('merchants')
          .update(request.changes)
          .eq('id', request.merchant_id);
        
        if (updateError) throw new Error(`Failed to apply changes to merchant: ${updateError.message}`);
      }

      // Update request status
      const { error: finalError } = await adminClient
        .from('merchant_change_requests')
        .update({
          status: action,
          reviewed_by: caller.id,
          reviewed_at: now,
          rejection_reason: action === 'rejected' ? reason : null,
        })
        .eq('id', entity_id);
      
      if (finalError) throw new Error(`Failed to update change request status: ${finalError.message}`);

    } else if (entity_type === 'user') {
      const { error } = await adminClient.from('profiles').update({
        account_status: action,
      }).eq('id', entity_id);
      if (error) throw new Error(`User profile update failed: ${error.message}`);

    } else {
      return new Response(JSON.stringify({ error: 'Invalid entity_type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log to audit_logs
    await adminClient.from('audit_logs').insert({
      user_id: caller.id,
      action: `${entity_type}_${action}`,
      entity_type,
      entity_id,
      details: { action, reason: reason || null },
    });

    return new Response(JSON.stringify({ success: true, action, entity_type, entity_id }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('approve-entity error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
