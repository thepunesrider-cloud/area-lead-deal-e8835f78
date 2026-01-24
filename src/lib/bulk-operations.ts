/**
 * Bulk Operations for Admin
 * Perform batch operations on leads and users
 */

import { supabase } from '@/integrations/supabase/client';

export interface BulkOperationResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Bulk update lead status
 */
export const bulkUpdateLeadStatus = async (
  leadIds: string[],
  newStatus: string
): Promise<BulkOperationResult> => {
  const result: BulkOperationResult = {
    total: leadIds.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    const { error } = await supabase
      .from('leads')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .in('id', leadIds);

    if (error) throw error;

    result.success = leadIds.length;
  } catch (error) {
    result.failed = leadIds.length;
    result.errors.push({
      id: 'bulk-update',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return result;
};

/**
 * Bulk send notifications
 */
export const bulkSendNotifications = async (
  userIds: string[],
  title: string,
  message: string
): Promise<BulkOperationResult> => {
  const result: BulkOperationResult = {
    total: userIds.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    const notifications = userIds.map((userId) => ({
      user_id: userId,
      type: 'admin_notification',
      title,
      body: message,
      data: {},
      created_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('notifications').insert(notifications);

    if (error) throw error;

    result.success = userIds.length;
  } catch (error) {
    result.failed = userIds.length;
    result.errors.push({
      id: 'bulk-notifications',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return result;
};

/**
 * Bulk disable users
 */
export const bulkDisableUsers = async (userIds: string[]): Promise<BulkOperationResult> => {
  const result: BulkOperationResult = {
    total: userIds.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_suspended: true, updated_at: new Date().toISOString() })
      .in('id', userIds);

    if (error) throw error;

    result.success = userIds.length;
  } catch (error) {
    result.failed = userIds.length;
    result.errors.push({
      id: 'bulk-disable',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return result;
};

/**
 * Bulk approve users
 */
export const bulkApproveUsers = async (userIds: string[]): Promise<BulkOperationResult> => {
  const result: BulkOperationResult = {
    total: userIds.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_approved: true, updated_at: new Date().toISOString() })
      .in('id', userIds);

    if (error) throw error;

    result.success = userIds.length;
  } catch (error) {
    result.failed = userIds.length;
    result.errors.push({
      id: 'bulk-approve',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return result;
};

/**
 * Bulk delete leads
 */
export const bulkDeleteLeads = async (leadIds: string[]): Promise<BulkOperationResult> => {
  const result: BulkOperationResult = {
    total: leadIds.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    const { error } = await supabase.from('leads').delete().in('id', leadIds);

    if (error) throw error;

    result.success = leadIds.length;
  } catch (error) {
    result.failed = leadIds.length;
    result.errors.push({
      id: 'bulk-delete',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return result;
};

/**
 * Bulk assign leads to provider
 */
export const bulkAssignLeads = async (
  leadIds: string[],
  providerId: string
): Promise<BulkOperationResult> => {
  const result: BulkOperationResult = {
    total: leadIds.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    const { error } = await supabase
      .from('leads')
      .update({
        claimed_by_user_id: providerId,
        status: 'claimed',
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', leadIds);

    if (error) throw error;

    result.success = leadIds.length;
  } catch (error) {
    result.failed = leadIds.length;
    result.errors.push({
      id: 'bulk-assign',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return result;
};

/**
 * Bulk update subscription status
 */
export const bulkUpdateSubscriptionStatus = async (
  userIds: string[],
  isSubscribed: boolean,
  expiresAt?: Date
): Promise<BulkOperationResult> => {
  const result: BulkOperationResult = {
    total: userIds.length,
    success: 0,
    failed: 0,
    errors: [],
  };

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        is_subscribed: isSubscribed,
        subscription_expires_at: expiresAt?.toISOString() || null,
        updated_at: new Date().toISOString(),
      })
      .in('id', userIds);

    if (error) throw error;

    result.success = userIds.length;
  } catch (error) {
    result.failed = userIds.length;
    result.errors.push({
      id: 'bulk-subscription',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return result;
};

/**
 * Get bulk operation status
 */
export const getBulkOperationStatus = (result: BulkOperationResult): string => {
  const percentage = Math.round((result.success / result.total) * 100);
  return `${result.success}/${result.total} completed (${percentage}%)`;
};

/**
 * Format bulk operation errors
 */
export const formatBulkOperationErrors = (result: BulkOperationResult): string => {
  if (result.errors.length === 0) return 'No errors';

  return result.errors
    .map((e) => `${e.id}: ${e.error}`)
    .join('\n');
};
