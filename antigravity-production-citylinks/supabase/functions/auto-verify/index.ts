import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dummy verification databases (same as verify-document)
const VALID_PANS: Record<string, string> = {
  'ABCDE1234F': 'Rajesh Kumar',
  'FGHIJ5678K': 'Priya Sharma',
  'LMNOP9012Q': 'Suresh Patel',
  'RSTUV3456W': 'Anita Desai',
};

const VALID_BANK_ACCOUNTS: Record<string, boolean> = {
  '1234567890': true,
  '9876543210': true,
  '1122334455': true,
  '5566778899': true,
};

const VALID_AADHAAR: Record<string, boolean> = {
  '123456789012': true,
  '987654321098': true,
  '112233445566': true,
};

const VALID_VEHICLES: Record<string, boolean> = {
  'KA01AB1234': true,
  'KA02CD5678': true,
  'MH01XY9999': true,
};

const VALID_DL: Record<string, boolean> = {
  'KA0120200001234': true,
  'MH0120190005678': true,
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { entity_type, entity_id } = await req.json();

    if (entity_type === 'merchant') {
      const { data: merchant, error } = await adminClient
        .from('merchants')
        .select('*')
        .eq('id', entity_id)
        .single();

      if (error || !merchant) {
        return new Response(JSON.stringify({ auto_approved: false, reason: 'Merchant not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const panValid = merchant.pan_number && VALID_PANS[merchant.pan_number];
      const bankValid = merchant.bank_account_number && VALID_BANK_ACCOUNTS[merchant.bank_account_number];
      const hasPhone = !!merchant.phone && merchant.phone.length >= 10;
      const hasAddress = !!merchant.address && merchant.address.trim().length > 5;
      const hasGst = !!merchant.gst_number && merchant.gst_number.length === 15;

      const allValid = panValid && bankValid && hasPhone && hasAddress && hasGst;

      if (allValid) {
        await adminClient.from('merchants').update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
        }).eq('id', entity_id);

        await adminClient.from('profiles').update({
          account_status: 'approved',
        }).eq('id', merchant.user_id);

        await adminClient.from('audit_logs').insert({
          user_id: merchant.user_id,
          action: 'merchant_auto_approved',
          entity_type: 'merchant',
          entity_id,
          details: { method: 'automatic', pan: !!panValid, bank: !!bankValid, phone: hasPhone, address: hasAddress, gst: hasGst },
        });

        return new Response(JSON.stringify({ auto_approved: true, reason: 'All documents verified automatically' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const failures: string[] = [];
      if (!panValid) failures.push('PAN not verified');
      if (!bankValid) failures.push('Bank account not verified');
      if (!hasPhone) failures.push('Phone missing');
      if (!hasAddress) failures.push('Address missing');
      if (!hasGst) failures.push('GST not verified');

      return new Response(JSON.stringify({ auto_approved: false, reason: 'Manual review required', failures }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (entity_type === 'labor') {
      const { data: labor, error } = await adminClient
        .from('labor_profiles')
        .select('*')
        .eq('id', entity_id)
        .single();

      if (error || !labor) {
        return new Response(JSON.stringify({ auto_approved: false, reason: 'Labor profile not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const panValid = labor.pan_number && VALID_PANS[labor.pan_number];
      const bankValid = labor.bank_account_number && VALID_BANK_ACCOUNTS[labor.bank_account_number];
      // labor_id_number acts as Aadhaar-equivalent here
      const idValid = labor.labor_id_number && VALID_AADHAAR[labor.labor_id_number];

      const allValid = panValid && bankValid && idValid;

      if (allValid) {
        await adminClient.from('labor_profiles').update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
        }).eq('id', entity_id);

        await adminClient.from('profiles').update({
          account_status: 'approved',
        }).eq('id', labor.user_id);

        await adminClient.from('audit_logs').insert({
          user_id: labor.user_id,
          action: 'labor_auto_approved',
          entity_type: 'labor',
          entity_id,
          details: { method: 'automatic', pan: !!panValid, bank: !!bankValid, id: !!idValid },
        });

        return new Response(JSON.stringify({ auto_approved: true, reason: 'All documents verified automatically' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const failures: string[] = [];
      if (!panValid) failures.push('PAN not verified');
      if (!bankValid) failures.push('Bank account not verified');
      if (!idValid) failures.push('Labor ID/Aadhaar not verified');

      return new Response(JSON.stringify({ auto_approved: false, reason: 'Manual review required', failures }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (entity_type === 'transporter') {
      const { data: transporter, error } = await adminClient
        .from('transporters')
        .select('*')
        .eq('id', entity_id)
        .single();

      if (error || !transporter) {
        return new Response(JSON.stringify({ auto_approved: false, reason: 'Transporter not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const panValid = transporter.pan_number && VALID_PANS[transporter.pan_number];
      const bankValid = transporter.bank_account_number && VALID_BANK_ACCOUNTS[transporter.bank_account_number];
      const vehicleValid = transporter.vehicle_number && VALID_VEHICLES[transporter.vehicle_number];
      const dlValid = transporter.dl_number && VALID_DL[transporter.dl_number];
      const permitValid = !!transporter.business_permit_number && transporter.business_permit_number.length > 3;

      const allValid = panValid && bankValid && vehicleValid && dlValid && permitValid;

      if (allValid) {
        await adminClient.from('transporters').update({
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
        }).eq('id', entity_id);

        await adminClient.from('profiles').update({
          account_status: 'approved',
        }).eq('id', transporter.user_id);

        await adminClient.from('audit_logs').insert({
          user_id: transporter.user_id,
          action: 'transporter_auto_approved',
          entity_type: 'transporter',
          entity_id,
          details: { method: 'automatic', pan: !!panValid, bank: !!bankValid, vehicle: !!vehicleValid, dl: !!dlValid, permit: permitValid },
        });

        return new Response(JSON.stringify({ auto_approved: true, reason: 'All documents verified automatically' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const failures: string[] = [];
      if (!panValid) failures.push('PAN not verified');
      if (!bankValid) failures.push('Bank account not verified');
      if (!vehicleValid) failures.push('Vehicle not verified');
      if (!dlValid) failures.push('DL not verified');
      if (!permitValid) failures.push('Business permit missing/invalid');

      return new Response(JSON.stringify({ auto_approved: false, reason: 'Manual review required', failures }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid entity_type' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('auto-verify error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
