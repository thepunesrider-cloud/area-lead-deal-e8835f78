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

    const body = await req.json();
    const { message_id, raw_message, sender_phone, sender_name, preview_only, override_data } = body;

    if (!raw_message) {
      return new Response(JSON.stringify({ error: 'raw_message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Parsing message:', message_id || 'preview mode');

    // PREVIEW ONLY MODE - just parse and return without creating lead
    if (preview_only) {
      const { parsed, confidence } = await parseMessageWithAI(raw_message);
      const customerPhone = extractValidPhone(parsed.customer_phone, sender_phone);
      
      // Geocode for preview
      let location = null;
      if (parsed.location_address && parsed.location_address.length >= 5) {
        location = await geocodeAddress(parsed.location_address);
      }
      
      return new Response(JSON.stringify({ 
        parsed: {
          ...parsed,
          customer_phone: customerPhone || sender_phone?.replace(/^91/, '').slice(-10) || null,
        },
        confidence,
        location
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Full approval mode - need message_id
    if (!message_id) {
      return new Response(JSON.stringify({ error: 'message_id is required for approval' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let finalData;
    let finalConfidence = 100;

    if (override_data) {
      // Use override data from preview modal (admin already edited)
      finalData = {
        customer_name: override_data.customer_name,
        customer_phone: override_data.customer_phone || sender_phone?.replace(/^91/, '').slice(-10),
        location_address: override_data.location_address,
        service_type: override_data.service_type || 'rent_agreement',
        special_instructions: override_data.special_instructions,
      };
      
      // Validate overridden phone
      if (!finalData.customer_phone || finalData.customer_phone.length !== 10) {
        return new Response(JSON.stringify({ 
          error: 'Invalid phone number',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Validate overridden address
      if (!finalData.location_address || finalData.location_address.length < 5) {
        return new Response(JSON.stringify({ 
          error: 'Address is required',
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      // Parse message with AI
      const { parsed, confidence } = await parseMessageWithAI(raw_message);
      finalConfidence = confidence;
      
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

      finalData = {
        customer_name: parsed.customer_name,
        customer_phone: customerPhone,
        location_address: parsed.location_address,
        service_type: parsed.service_type || 'rent_agreement',
        special_instructions: parsed.special_instructions,
      };
    }

    // Get location - either from override or geocode
    let location = { lat: 19.076, lng: 72.8777 }; // Default to Mumbai
    
    if (override_data?.location_lat && override_data?.location_lng) {
      location = { lat: override_data.location_lat, lng: override_data.location_lng };
    } else {
      const geocoded = await geocodeAddress(finalData.location_address!);
      if (geocoded) {
        location = geocoded;
      }
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
        customer_name: finalData.customer_name || sender_name || 'Unknown',
        customer_phone: finalData.customer_phone,
        location_address: finalData.location_address,
        location_lat: location.lat,
        location_long: location.lng,
        service_type: finalData.service_type || 'rent_agreement',
        special_instructions: finalData.special_instructions,
        lead_generator_phone: sender_phone?.replace(/^91/, '').slice(-10) || null,
        lead_generator_name: sender_name,
        source: 'whatsapp_bot',
        raw_message: raw_message,
        import_confidence: finalConfidence,
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
      parsed: finalData,
      confidence: finalConfidence
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
