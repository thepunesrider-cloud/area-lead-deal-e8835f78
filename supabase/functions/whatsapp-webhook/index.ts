import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-bot-auth-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authKey = req.headers.get('X-Bot-Auth-Key') || req.headers.get('Authorization')?.replace('Bearer ', '');
    const expectedAuthKey = Deno.env.get('WHATSAPP_BOT_AUTH_KEY');

    if (!authKey || authKey !== expectedAuthKey) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const { message } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Deduplication: Check if same message from same sender exists in last 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: existingMessage } = await supabaseClient
      .from('whatsapp_messages')
      .select('id')
      .eq('sender_phone', message.sender_phone)
      .eq('raw_message', message.raw_message)
      .gte('created_at', oneHourAgo)
      .maybeSingle();

    if (existingMessage) {
      console.log('Duplicate message detected, skipping:', existingMessage.id);
      return new Response(JSON.stringify({ 
        success: true, 
        duplicate: true, 
        existing_id: existingMessage.id,
        message: 'Duplicate message detected within last hour'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Save raw message to database
    const { data, error } = await supabaseClient
      .from('whatsapp_messages')
      .insert([{
        sender_name: message.sender_name,
        sender_phone: message.sender_phone,
        raw_message: message.raw_message,
        group_name: message.group_name,
        group_id: message.group_id,
        message_timestamp: message.timestamp,
        status: 'new',
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
