import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { parseMessageWithAI, geocodeAddress, extractValidPhone } from '../_shared/lead-parser.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseClient.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden - Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { message_id, raw_message, sender_phone, sender_name } = await req.json();

    if (!message_id || !raw_message) {
      return new Response(JSON.stringify({ error: 'message_id and raw_message are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Parsing message:', message_id);

    // Parse message with AI
    const { parsed, confidence } = await parseMessageWithAI(raw_message);
    
    // Extract valid phone number
    const customerPhone = extractValidPhone(parsed.customer_phone, sender_phone);
    
    if (!customerPhone) {
      return new Response(JSON.stringify({ 
        error: 'No valid phone number found in message',
        parsed,
        confidence
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate address
    if (!parsed.location_address || parsed.location_address.length < 5) {
      return new Response(JSON.stringify({ 
        error: 'No valid address found in message',
        parsed,
        confidence
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Geocode the address
    let location = { lat: 19.076, lng: 72.8777 }; // Default to Mumbai
    const geocoded = await geocodeAddress(parsed.location_address);
    if (geocoded) {
      location = geocoded;
    }

    // Use service role to create lead and update message
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Create the lead
    const { data: lead, error: leadError } = await serviceClient
      .from('leads')
      .insert({
        customer_name: parsed.customer_name || sender_name || 'Unknown',
        customer_phone: customerPhone,
        location_address: parsed.location_address,
        location_lat: location.lat,
        location_long: location.lng,
        service_type: parsed.service_type || 'rent_agreement',
        special_instructions: parsed.special_instructions,
        lead_generator_phone: sender_phone?.replace(/^91/, '').slice(-10) || null,
        lead_generator_name: sender_name,
        source: 'whatsapp_bot',
        raw_message: raw_message,
        import_confidence: confidence,
        status: 'open',
        created_by_user_id: user.id,
        whatsapp_message_id: message_id,
      })
      .select()
      .single();

    if (leadError) {
      console.error('Error creating lead:', leadError);
      return new Response(JSON.stringify({ error: 'Failed to create lead', details: leadError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update whatsapp_messages status to approved
    const { error: updateError } = await serviceClient
      .from('whatsapp_messages')
      .update({ status: 'approved' })
      .eq('id', message_id);

    if (updateError) {
      console.error('Error updating message status:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      lead,
      parsed,
      confidence
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Parse error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
