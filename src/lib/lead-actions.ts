/**
 * Lead rejection and state management logic
 */

import { supabase } from '@/integrations/supabase/client';

export interface LeadAction {
  leadId: string;
  action: 'accept' | 'reject' | 'complete';
  proofUrl?: string;
  notes?: string;
}

/**
 * Accept a lead (claim it)
 */
export const acceptLead = async (leadId: string, userId: string): Promise<{ success: boolean; error?: Error }> => {
  try {
    const { error } = await supabase
      .from('leads')
      .update({
        status: 'claimed',
        claimed_by_user_id: userId,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', leadId)
      .eq('status', 'open'); // Ensure it's still open (prevent race condition)

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * Reject a lead
 * - Reset claimed_by_user_id to null
 * - Keep status as 'open' or set to 'rejected' if needed
 * - Allow other users to claim it
 */
export const rejectLead = async (leadId: string): Promise<{ success: boolean; error?: Error }> => {
  try {
    const { error } = await supabase
      .from('leads')
      .update({
        claimed_by_user_id: null,
        claimed_at: null,
        status: 'open', // Reset to open so others can claim
      })
      .eq('id', leadId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * Complete a lead with proof
 */
export const completeLead = async (
  leadId: string,
  proofUrl: string,
  specialInstructions?: string
): Promise<{ success: boolean; error?: Error }> => {
  try {
    const { error } = await supabase
      .from('leads')
      .update({
        status: 'completed',
        proof_url: proofUrl,
        completed_at: new Date().toISOString(),
        special_instructions: specialInstructions || null,
      })
      .eq('id', leadId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};

/**
 * Reject a completed lead (admin action)
 */
export const rejectCompletedLead = async (
  leadId: string,
  reason?: string
): Promise<{ success: boolean; error?: Error }> => {
  try {
    const { error } = await supabase
      .from('leads')
      .update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        special_instructions: reason || null,
      })
      .eq('id', leadId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error as Error };
  }
};
