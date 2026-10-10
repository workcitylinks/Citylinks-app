const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Dummy valid IDs for testing
const VALID_PANS: Record<string, string> = {
  'ABCDE1234F': 'Rajesh Kumar',
  'FGHIJ5678K': 'Priya Sharma',
  'LMNOP9012Q': 'Suresh Patel',
  'RSTUV3456W': 'Anita Desai',
};

const VALID_GSTS: Record<string, string> = {
  '22AAAAA0000A1Z5': 'Kumar Traders Pvt Ltd',
  '29AABCT1332L1ZL': 'Sharma Electronics',
  '07AAGCA1234B1ZX': 'Patel General Store',
  '27AALCS1234C1Z5': 'Desai Services LLP',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, number } = await req.json();
    const upperNumber = number?.toUpperCase?.() || '';

    if (type === 'pan') {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
      const formatValid = panRegex.test(upperNumber);
      const holderName = VALID_PANS[upperNumber] || null;

      return new Response(JSON.stringify({
        type: 'pan',
        number: upperNumber,
        format_valid: formatValid,
        verified: !!holderName,
        holder_name: holderName,
        message: !formatValid ? 'Invalid PAN format' : holderName ? `PAN verified — ${holderName}` : 'PAN not found in records',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (type === 'gst') {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
      const formatValid = gstRegex.test(upperNumber);
      const businessName = VALID_GSTS[upperNumber] || null;

      return new Response(JSON.stringify({
        type: 'gst',
        number: upperNumber,
        format_valid: formatValid,
        verified: !!businessName,
        business_name: businessName,
        message: !formatValid ? 'Invalid GST format' : businessName ? `GST verified — ${businessName}` : 'GST not found in records',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid document type. Use "pan" or "gst".' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
