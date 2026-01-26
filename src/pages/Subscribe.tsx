import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, CheckCircle, Shield, Loader2, CreditCard, RefreshCw, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import SubscriptionTimer from '@/components/SubscriptionTimer';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Subscribe: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if Razorpay script is loaded
  useEffect(() => {
    const checkRazorpay = () => {
      if (typeof window.Razorpay !== 'undefined') {
        setRazorpayLoaded(true);
        return true;
      }
      return false;
    };

    // Check immediately
    if (checkRazorpay()) return;

    // Poll every 500ms for up to 10 seconds
    const interval = setInterval(() => {
      if (checkRazorpay()) {
        clearInterval(interval);
      }
    }, 500);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      if (!razorpayLoaded) {
        toast({
          variant: 'destructive',
          title: 'Payment System Error',
          description: 'Razorpay failed to load. Please refresh the page.',
        });
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [razorpayLoaded, toast]);


  const handleApplyCoupon = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please login to apply coupon.',
      });
      return;
    }

    if (!couponCode.trim()) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please enter a coupon code.',
      });
      return;
    }

    setCouponLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      
      const { data, error } = await supabase.functions.invoke('create-razorpay-subscription', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: { coupon_code: couponCode.trim().toUpperCase() },
      });

      if (error) {
        throw new Error(error.message || 'Failed to apply coupon');
      }

      if (data?.type === 'coupon-applied') {
        toast({
          title: '🎉 Coupon Applied!',
          description: data.message,
        });

        await refreshProfile();
        
        setTimeout(() => {
          navigate('/get-leads');
        }, 1500);
      } else if (data?.error) {
        toast({
          variant: 'destructive',
          title: 'Invalid Coupon',
          description: data.error,
        });
      }
    } catch (error) {
      console.error('Coupon error:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to apply coupon',
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSubscribe = async () => {
    const razorpayReady = typeof window.Razorpay !== 'undefined';
    if (!user || (!razorpayLoaded && !razorpayReady)) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Payment system not ready. Please try again.',
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const key = import.meta.env.VITE_RAZORPAY_KEY_ID;
      if (!key) {
        throw new Error('Razorpay key not configured');
      }

      // Call edge function to create a new subscription dynamically
      // Get the access token using supabase.auth.getSession() (async)
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      const { data: subscriptionData, error: subError } = await supabase.functions.invoke('create-razorpay-subscription', {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      });
      
      if (subError || !subscriptionData) {
        throw new Error(subError?.message || 'Failed to create subscription');
      }

      console.log('Subscription created:', subscriptionData);

      // Configure Razorpay checkout
      const options: any = {
        key,
        name: 'LEADX Premium',
        description: '₹499/month - Auto-renews every 30 days',
        prefill: {
          name: profile?.name ?? 'User',
          email: user.email || 'user@example.com',
          contact: profile?.phone ?? '9999999999',
        },
        notes: {
          user_id: user.id,
        },
        theme: {
          color: '#0f172a',
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast({
              title: 'Payment Cancelled',
              description: 'You cancelled the payment. Try again when ready.',
            });
          },
        },
        handler: async (response: any) => {
          try {
            console.log('Payment successful:', response);
            
            if (!user?.id) {
              throw new Error('User ID not found');
            }

            // Verify payment on server
            const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              },
            });

            if (verifyError) {
              console.error('Verification error:', verifyError);
            }

            // Manually activate subscription in DB
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + 30);

            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                is_subscribed: true,
                subscription_expires_at: expiryDate.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('id', user.id);

            if (updateError) {
              console.error('Subscription update failed:', updateError);
              throw new Error(`Failed to update subscription: ${updateError.message}`);
            }

            await refreshProfile();
            
            toast({
              title: '🎉 Subscription Activated!',
              description: 'Your premium subscription is now active for 30 days with autopay enabled.',
            });

            // Refresh payment history
            const { data } = await supabase
              .from('payments')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false })
              .limit(5);
            
            setPaymentHistory(data || []);

            setTimeout(() => {
              navigate('/get-leads');
            }, 1000);
          } catch (error) {
            console.error('Payment handler error:', error);
            toast({
              variant: 'destructive',
              title: 'Activation Error',
              description: error instanceof Error ? error.message : 'Failed to activate subscription',
            });
          } finally {
            setLoading(false);
          }
        },
      };

      // Add subscription_id for autopay subscription
      if (subscriptionData.type === 'subscription') {
        options.subscription_id = subscriptionData.subscription_id;
      } else {
        // Fallback to order-based payment
        options.order_id = subscriptionData.order_id;
        options.amount = subscriptionData.amount;
        options.currency = subscriptionData.currency;
      }

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error instanceof Error ? error.message : 'Failed to initiate payment. Please try again.',
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    // Fetch payment history
    const fetchPayments = async () => {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setPaymentHistory(data || []);
    };
    
    fetchPayments();
  }, [user, navigate]);

  const benefits = [
    'View full lead details including customer phone',
    'Accept unlimited leads in your area',
    'Priority notifications for new leads',
    'Chat with lead generators',
    'Access to community chat',
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Subscription" showBack />

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Current Status with Timer */}
        <div className={`rounded-2xl p-6 text-center ${
          profile?.is_subscribed 
            ? 'bg-primary/10 border-2 border-primary' 
            : 'bg-card border border-border'
        }`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            profile?.is_subscribed ? 'bg-primary' : 'bg-secondary'
          }`}>
            <Star size={32} className={profile?.is_subscribed ? 'fill-primary-foreground text-primary-foreground' : 'text-secondary-foreground'} />
          </div>
          
          <h2 className="text-xl font-bold text-foreground">
            {profile?.is_subscribed ? 'Premium Active' : 'Free Plan'}
          </h2>
          
          {/* Subscription Timer */}
          <div className="mt-4">
            <SubscriptionTimer 
              expiresAt={profile?.subscription_expires_at || null}
              isSubscribed={profile?.is_subscribed || false}
            />
          </div>
        </div>

        {/* Premium Plan Card */}
        {!profile?.is_subscribed && (
          <div className="bg-gradient-to-br from-secondary/20 to-primary/20 rounded-2xl p-6 border border-secondary/30 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-secondary" size={24} />
              <h3 className="text-lg font-bold text-foreground">Premium Plan</h3>
            </div>
            
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-extrabold text-foreground">₹499</span>
              <span className="text-muted-foreground">{t('perMonth')}</span>
            </div>
            
            <ul className="space-y-3 mb-6">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="text-primary shrink-0 mt-0.5" size={18} />
                  <span className="text-foreground">{benefit}</span>
                </li>
              ))}
            </ul>

            <div className="bg-primary/10 rounded-lg p-3 mb-4 text-center">
              <p className="text-sm text-primary font-medium">
                ✨ Autopay enabled - Auto-renews every 30 days
              </p>
            </div>

            {/* Coupon Code Input */}
            <div className="mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={16} />
                  <Input
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    className="pl-10 uppercase"
                    disabled={couponLoading}
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                >
                  {couponLoading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    'Apply'
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Have a coupon? Enter it above for special offers!
              </p>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or pay with card</span>
              </div>
            </div>
            
            <Button
              variant="heroSecondary"
              className="w-full"
              onClick={handleSubscribe}
              disabled={loading || !razorpayLoaded}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <CreditCard size={20} />
                  <span>{t('subscribeNow')}</span>
                </>
              )}
            </Button>

            {!razorpayLoaded && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Loading payment system...
              </p>
            )}
          </div>
        )}

        {/* Renew Button for existing subscribers */}
        {profile?.is_subscribed && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSubscribe}
              disabled={loading || !razorpayLoaded}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <RefreshCw size={18} />
                  <span>Renew Subscription</span>
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Extend by another 30 days
            </p>
          </div>
        )}

        {/* Payment History */}
        {paymentHistory.length > 0 && (
          <div className="bg-card rounded-2xl border border-border p-4">
            <h3 className="font-semibold text-foreground mb-4">Payment History</h3>
            <div className="space-y-3">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      ₹{(payment.amount / 100).toFixed(0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    payment.status === 'completed' 
                      ? 'bg-primary/20 text-primary' 
                      : payment.status === 'pending'
                      ? 'bg-secondary/20 text-secondary'
                      : 'bg-destructive/20 text-destructive'
                  }`}>
                    {payment.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Already Subscribed Message */}
        {profile?.is_subscribed && (
          <div className="bg-card rounded-2xl border border-border p-4 text-center">
            <CheckCircle className="text-primary mx-auto mb-3" size={48} />
            <h3 className="font-semibold text-foreground">You're all set!</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Enjoy unlimited access to all leads in your area.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/get-leads')}
            >
              Browse Leads
            </Button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Subscribe;
