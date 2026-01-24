/**
 * SMS Notifications via MSG91
 * Send SMS alerts to users via MSG91 API
 */

import { supabase } from '@/integrations/supabase/client';

interface SMSTemplateVars {
  [key: string]: string;
}

export const SMS_TEMPLATES = {
  LEAD_AVAILABLE: {
    id: 'lead_available',
    name: 'New Lead Available',
    description: 'Notify provider of available lead',
  },
  LEAD_CLAIMED: {
    id: 'lead_claimed',
    name: 'Lead Claimed',
    description: 'Notify generator that lead was claimed',
  },
  LEAD_COMPLETED: {
    id: 'lead_completed',
    name: 'Lead Completed',
    description: 'Notify generator that lead was completed',
  },
  LEAD_REJECTED: {
    id: 'lead_rejected',
    name: 'Lead Rejected',
    description: 'Notify generator that lead was rejected',
  },
  RATING_RECEIVED: {
    id: 'rating_received',
    name: 'Rating Received',
    description: 'Notify provider of new rating',
  },
  SUBSCRIPTION_EXPIRING: {
    id: 'subscription_expiring',
    name: 'Subscription Expiring',
    description: 'Notify user subscription is expiring soon',
  },
};

/**
 * Send SMS notification
 */
export const sendSMS = async (
  phoneNumber: string,
  templateId: string,
  variables: SMSTemplateVars = {}
): Promise<{ success: boolean; messageId?: string; error?: string }> => {
  try {
    // Format phone number
    const formattedPhone = phoneNumber.startsWith('91') ? phoneNumber : `91${phoneNumber.replace(/^0+/, '')}`;

    // Call Supabase Edge Function to send SMS
    const { data, error } = await supabase.functions.invoke('send-sms-notification', {
      body: {
        phoneNumber: formattedPhone,
        templateId,
        variables,
      },
    });

    if (error) {
      throw new Error(error.message || 'Failed to send SMS');
    }

    return {
      success: true,
      messageId: data?.messageId,
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Send SMS to lead generator when lead is completed
 */
export const notifyGeneratorLeadCompleted = async (
  generatorPhone: string,
  generatorName: string,
  serviceType: string
): Promise<{ success: boolean; error?: string }> => {
  const variables: SMSTemplateVars = {
    name: generatorName,
    serviceType,
    appName: 'LeadsNearby',
  };

  return sendSMS(generatorPhone, SMS_TEMPLATES.LEAD_COMPLETED.id, variables);
};

/**
 * Send SMS to provider when lead is available
 */
export const notifyProviderLeadAvailable = async (
  providerPhone: string,
  providerName: string,
  serviceType: string,
  location: string
): Promise<{ success: boolean; error?: string }> => {
  const variables: SMSTemplateVars = {
    name: providerName,
    serviceType,
    location,
    appName: 'LeadsNearby',
  };

  return sendSMS(providerPhone, SMS_TEMPLATES.LEAD_AVAILABLE.id, variables);
};

/**
 * Send SMS when subscription is expiring
 */
export const notifySubscriptionExpiring = async (
  userPhone: string,
  userName: string,
  daysRemaining: number
): Promise<{ success: boolean; error?: string }> => {
  const variables: SMSTemplateVars = {
    name: userName,
    daysRemaining: daysRemaining.toString(),
    appName: 'LeadsNearby',
  };

  return sendSMS(userPhone, SMS_TEMPLATES.SUBSCRIPTION_EXPIRING.id, variables);
};

/**
 * Send bulk SMS
 */
export const sendBulkSMS = async (
  recipients: Array<{ phone: string; name: string }>,
  templateId: string,
  variablesTemplate: (recipient: { phone: string; name: string }) => SMSTemplateVars
): Promise<
  Array<{
    phone: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>
> => {
  const results = await Promise.allSettled(
    recipients.map((recipient) =>
      sendSMS(recipient.phone, templateId, variablesTemplate(recipient))
    )
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return {
        phone: recipients[index].phone,
        success: result.value.success,
        messageId: result.value.messageId,
        error: result.value.error,
      };
    } else {
      return {
        phone: recipients[index].phone,
        success: false,
        error: result.reason?.message || 'Request failed',
      };
    }
  });
};

/**
 * Get SMS template content
 */
export const getSMSTemplate = (templateId: string): string => {
  const templates: { [key: string]: string } = {
    [SMS_TEMPLATES.LEAD_COMPLETED.id]: `Hi {{name}}, your {{serviceType}} lead has been completed! Check LeadsNearby app for details.`,
    [SMS_TEMPLATES.LEAD_AVAILABLE.id]: `Hi {{name}}, a new {{serviceType}} lead is available in {{location}}. Open LeadsNearby to claim it!`,
    [SMS_TEMPLATES.SUBSCRIPTION_EXPIRING.id]: `Hi {{name}}, your LeadsNearby subscription expires in {{daysRemaining}} days. Renew now to continue receiving leads!`,
    [SMS_TEMPLATES.LEAD_CLAIMED.id]: `Hi {{name}}, your {{serviceType}} lead has been claimed! You can chat with the agent in the app.`,
    [SMS_TEMPLATES.LEAD_REJECTED.id]: `Hi {{name}}, your {{serviceType}} lead was rejected. View details in LeadsNearby app.`,
    [SMS_TEMPLATES.RATING_RECEIVED.id]: `Hi {{name}}, you received a new {{rating}}-star rating! Check your profile in LeadsNearby.`,
  };

  return templates[templateId] || 'Default SMS message';
};

/**
 * Track SMS delivery status
 */
export const trackSMSDelivery = async (messageId: string): Promise<any> => {
  try {
    // This would typically call an API to get SMS status
    // For now, return a placeholder
    console.log(`Tracking SMS delivery for message: ${messageId}`);
    return { status: 'pending' };
  } catch (error) {
    console.error('Error tracking SMS:', error);
    throw error;
  }
};
