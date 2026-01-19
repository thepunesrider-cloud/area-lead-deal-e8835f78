// Auto-reject leads that have been claimed for more than 3 days without completion
// This edge function should be triggered daily via cron

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date minus 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Find leads that need to be auto-rejected
    const { data: expiredLeads, error: fetchError } = await supabase
      .from('leads')
      .select('id, claimed_by_user_id, created_by_user_id, service_type')
      .eq('status', 'claimed')
      .not('claimed_at', 'is', null)
      .lt('claimed_at', threeDaysAgo.toISOString())
      .is('completed_at', null);

    if (fetchError) {
      throw fetchError;
    }

    if (!expiredLeads || expiredLeads.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No leads to auto-reject', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Auto-reject each lead
    const rejectedLeads = [];
    for (const lead of expiredLeads) {
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: 'open',
          claimed_by_user_id: null,
          claimed_at: null,
          rejected_at: new Date().toISOString(),
        })
        .eq('id', lead.id);

      if (!updateError) {
        rejectedLeads.push(lead.id);

        // Send notification to lead generator
        if (lead.created_by_user_id) {
          await supabase.from('notifications').insert({
            user_id: lead.created_by_user_id,
            type: 'lead_auto_rejected',
            title: 'Lead Auto-Released',
            body: `Your lead was automatically released after 3 days without completion.`,
            data: {
              leadId: lead.id,
              serviceType: lead.service_type,
            },
          });
        }

        // Send notification to agent
        if (lead.claimed_by_user_id) {
          await supabase.from('notifications').insert({
            user_id: lead.claimed_by_user_id,
            type: 'lead_auto_rejected',
            title: 'Lead Expired',
            body: `A claimed lead was automatically released after 3 days without completion.`,
            data: {
              leadId: lead.id,
              serviceType: lead.service_type,
            },
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Auto-rejection completed', 
        count: rejectedLeads.length,
        rejectedLeadIds: rejectedLeads 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
