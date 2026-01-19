/**
 * Auto-rejection utilities for leads
 * Checks and auto-rejects leads claimed for more than 3 days without completion
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Check and auto-reject expired leads (client-side check)
 * This runs when user opens the app as a backup to edge function
 */
export const checkExpiredLeads = async (): Promise<number> => {
  try {
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
      console.error('Error fetching expired leads:', fetchError);
      return 0;
    }

    if (!expiredLeads || expiredLeads.length === 0) {
      return 0;
    }

    // Auto-reject each lead
    let rejectedCount = 0;
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
        rejectedCount++;

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

    return rejectedCount;
  } catch (error) {
    console.error('Error in checkExpiredLeads:', error);
    return 0;
  }
};

/**
 * Get days remaining before a lead expires
 */
export const getDaysUntilExpiry = (claimedAt: string | null): number | null => {
  if (!claimedAt) return null;

  const claimed = new Date(claimedAt);
  const now = new Date();
  const diffMs = now.getTime() - claimed.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const daysRemaining = 3 - diffDays;

  return daysRemaining;
};

/**
 * Check if a lead is about to expire (less than 1 day remaining)
 */
export const isLeadAboutToExpire = (claimedAt: string | null): boolean => {
  const daysRemaining = getDaysUntilExpiry(claimedAt);
  return daysRemaining !== null && daysRemaining <= 1 && daysRemaining >= 0;
};

/**
 * Check if a lead has expired
 */
export const isLeadExpired = (claimedAt: string | null): boolean => {
  const daysRemaining = getDaysUntilExpiry(claimedAt);
  return daysRemaining !== null && daysRemaining < 0;
};
