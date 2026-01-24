// Razorpay subscription helper
// Usage: import { openSubscriptionCheckout } from '@/lib/razorpay';
// openSubscriptionCheckout({ subscriptionId: 'sub_xxx', userName, userEmail, userPhone, notes });

interface SubscriptionCheckoutOptions {
  subscriptionId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  notes?: Record<string, string>;
  themeColor?: string;
}

export function openSubscriptionCheckout(options: SubscriptionCheckoutOptions) {
  const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (!key) {
    throw new Error('Missing VITE_RAZORPAY_KEY_ID env');
  }
  if (!(window as any).Razorpay) {
    throw new Error('Razorpay script not loaded on page');
  }

  const rzp = new (window as any).Razorpay({
    key,
    subscription_id: options.subscriptionId,
    method: 'upi',
    config: { upi: { flow: 'intent' } },
    prefill: {
      name: options.userName,
      email: options.userEmail,
      contact: options.userPhone,
    },
    notes: options.notes,
    theme: {
      color: options.themeColor || '#0f172a',
    },
  });

  rzp.open();
  return rzp;
}
