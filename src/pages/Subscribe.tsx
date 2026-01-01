import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, CheckCircle, Shield, Loader2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { useToast } from '@/hooks/use-toast';

const Subscribe: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  
  const { user, profile, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const handleSubscribe = async () => {
    if (!user || !profile) return;
    
    setLoading(true);
    
    try {
      // Create a payment record
      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          amount: 50000, // ₹500 in paisa
          currency: 'INR',
          status: 'pending',
          payment_gateway: 'billdesk',
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // For now, redirect to WhatsApp for manual payment verification
      // In production, integrate BillDesk SDK here
      const message = encodeURIComponent(
        `Hi, I want to subscribe to LEADX Premium.\n\nPayment ID: ${payment.id}\nUser: ${profile.name}\nPhone: ${profile.phone || 'N/A'}\nAmount: ₹500`
      );
      
      window.open(`https://wa.me/919999999999?text=${message}`, '_blank');
      
      toast({
        title: 'Payment Initiated',
        description: 'Please complete the payment via WhatsApp. Your subscription will be activated within 24 hours.',
      });
      
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
        description: 'Failed to initiate payment. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

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
        {/* Current Status */}
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
          
          {profile?.is_subscribed && profile?.subscription_expires_at && (
            <p className="text-sm text-muted-foreground mt-2">
              Expires: {new Date(profile.subscription_expires_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Premium Plan Card */}
        {!profile?.is_subscribed && (
          <div className="bg-gradient-to-br from-secondary/20 to-primary/20 rounded-2xl p-6 border border-secondary/30 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-secondary" size={24} />
              <h3 className="text-lg font-bold text-foreground">Premium Plan</h3>
            </div>
            
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-4xl font-extrabold text-foreground">₹500</span>
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
            
            <Button
              variant="heroSecondary"
              className="w-full"
              onClick={handleSubscribe}
              disabled={loading}
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

        {/* Already Subscribed */}
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
