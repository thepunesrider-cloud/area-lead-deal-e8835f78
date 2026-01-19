/**
 * Push Notifications using Supabase
 * Stores tokens and sends notifications via database
 */

import { supabase } from '@/integrations/supabase/client';

export interface NotificationPayload {
  type:
    | 'new_lead'
    | 'lead_accepted'
    | 'lead_rejected'
    | 'lead_completed'
    | 'lead_recalled'
    | 'lead_auto_rejected'
    | 'payment_success'
    | 'subscription_expiry';
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Save FCM token for the user
 */
export const savePushToken = async (userId: string, token: string, deviceType?: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .insert({
        user_id: userId,
        token,
        device_type: deviceType || 'web',
      });

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violated, token already exists
        return true;
      }
      throw error;
    }
    return true;
  } catch (error) {
    console.error('Error saving push token:', error);
    return false;
  }
};

/**
 * Create a notification in the database
 * In production, you'd trigger a cloud function to send actual push notifications
 */
export const createNotification = async (
  userId: string,
  payload: NotificationPayload
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating notification:', error);
    return false;
  }
};

/**
 * Ask for browser notification permission
 */
export const requestBrowserNotificationPermission = async (): Promise<NotificationPermission> => {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
};

/**
 * Show a browser notification (Chrome/Desktop)
 */
export const showBrowserNotification = (
  title: string,
  body: string,
  data?: Record<string, any>
): void => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body,
    data,
  });

  notification.onclick = () => {
    try {
      // Focus existing tab if possible
      window.focus();
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error('Notification click error', e);
    }
  };
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

/**
 * Trigger notifications for various lead events
 */
export const triggerLeadNotification = async (
  userId: string,
  eventType: 'accepted' | 'rejected' | 'completed' | 'recalled' | 'auto_rejected',
  leadData: { id: string; service_type: string; customer_name?: string }
): Promise<boolean> => {
  const notifications: Record<string, NotificationPayload> = {
    accepted: {
      type: 'lead_accepted',
      title: 'Lead Accepted!',
      body: `Your ${leadData.service_type?.replace(/_/g, ' ')} request has been accepted.`,
      data: { leadId: leadData.id },
    },
    rejected: {
      type: 'lead_rejected',
      title: 'Lead Rejected',
      body: `Your ${leadData.service_type?.replace(/_/g, ' ')} request was not completed.`,
      data: { leadId: leadData.id },
    },
    completed: {
      type: 'lead_completed',
      title: 'Lead Completed!',
      body: `Your ${leadData.service_type?.replace(/_/g, ' ')} request is complete!`,
      data: { leadId: leadData.id },
    },
    recalled: {
      type: 'lead_recalled',
      title: 'Lead Retrieved',
      body: `Your ${leadData.service_type?.replace(/_/g, ' ')} lead was retrieved by the generator.`,
      data: { leadId: leadData.id },
    },
    auto_rejected: {
      type: 'lead_auto_rejected',
      title: 'Lead Auto-Released',
      body: `Your ${leadData.service_type?.replace(/_/g, ' ')} lead was released after 3 days without completion.`,
      data: { leadId: leadData.id },
    },
  };

  return createNotification(userId, notifications[eventType]);
};
