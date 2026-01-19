/**
 * WhatsApp integration utilities
 */

export const generateWhatsAppLink = (phoneNumber: string, message?: string): string => {
  // Remove any non-digit characters except +
  const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
  
  // Ensure the phone number starts with country code (e.g., +91 for India)
  let formattedPhone = cleanPhone;
  if (!formattedPhone.startsWith('+')) {
    // Assume India (+91) if no country code
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+91' + formattedPhone.substring(1);
    } else if (formattedPhone.length === 10) {
      formattedPhone = '+91' + formattedPhone;
    } else {
      formattedPhone = '+' + formattedPhone;
    }
  }

  const encodedMessage = message ? encodeURIComponent(message) : '';
  
  // WhatsApp Web/App link
  // https://wa.me/[phone_number]/?text=[message]
  return `https://wa.me/${formattedPhone.replace(/\D/g, '')}${encodedMessage ? `?text=${encodedMessage}` : ''}`;
};

export const generateLeadWhatsAppMessage = (leadId: string, userName: string, leadType?: string): string => {
  return `Hi! I'm interested in your ${leadType || 'service request'} (Lead ID: ${leadId}). Contact: ${userName}`;
};

export const openWhatsApp = (phoneNumber: string, message?: string): void => {
  const url = generateWhatsAppLink(phoneNumber, message);
  window.open(url, '_blank');
};
