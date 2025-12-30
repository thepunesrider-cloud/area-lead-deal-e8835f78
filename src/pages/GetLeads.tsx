import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, MapPin, AlertCircle, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import LeadCard from '@/components/LeadCard';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface Lead {
  id: string;
  service_type: string;
  location_lat: number;
  location_long: number;
  location_address: string | null;
  customer_name: string | null;
  customer_phone: string;
  status: string;
  created_at: string;
  distance?: number;
}

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const GetLeads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [acceptingLead, setAcceptingLead] = useState(false);

  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const fetchLeads = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('status', 'open')
      .neq('created_by_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching leads:', error);
      return;
    }

    // Calculate distances if user has location
    let leadsWithDistance: Lead[] = (data || []).map((lead) => ({
      ...lead,
      status: lead.status || 'open',
    }));
    
    if (profile?.location_lat && profile?.location_long) {
      leadsWithDistance = leadsWithDistance.map((lead) => ({
        ...lead,
        distance: calculateDistance(
          profile.location_lat!,
          profile.location_long!,
          lead.location_lat,
          lead.location_long
        ),
      }));

      // Filter by radius and sort by distance
      leadsWithDistance = leadsWithDistance
        .filter((lead) => (lead.distance || 0) <= (profile.service_radius_km || 50))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    setLeads(leadsWithDistance);
  }, [user, profile]);

  useEffect(() => {
    const loadLeads = async () => {
      setLoading(true);
      await fetchLeads();
      setLoading(false);
    };
    loadLeads();
  }, [fetchLeads]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLeads]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchLeads();
    setRefreshing(false);
  };

  const handleViewDetails = (lead: Lead) => {
    if (!profile?.is_subscribed) {
      setShowSubscribeModal(true);
    } else {
      setSelectedLead(lead);
    }
  };

  const handleAcceptLead = async (lead: Lead) => {
    if (!profile?.is_subscribed) {
      setShowSubscribeModal(true);
      return;
    }

    setAcceptingLead(true);

    // Atomic update with race condition handling
    const { data, error } = await supabase
      .from('leads')
      .update({
        status: 'claimed',
        claimed_by_user_id: user?.id,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', lead.id)
      .eq('status', 'open')
      .select()
      .single();

    setAcceptingLead(false);

    if (error || !data) {
      toast({
        variant: 'destructive',
        title: t('leadAlreadyTaken'),
        description: 'This lead was just taken by someone else.',
      });
      await fetchLeads();
    } else {
      toast({
        title: t('leadAccepted'),
        description: 'Check your history for details.',
      });
      setSelectedLead(null);
      navigate('/history');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header 
        title={t('getLeads')} 
        showBack
        rightElement={
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} />
          </Button>
        }
      />

      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Location Reminder */}
        {(!profile?.location_lat || !profile?.location_long) && (
          <div className="bg-secondary/10 border border-secondary/20 rounded-xl p-4 mb-4 flex items-start gap-3">
            <MapPin className="text-secondary shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-medium text-foreground">Set your location</p>
              <p className="text-xs text-muted-foreground mt-1">
                Go to Profile to set your location and see nearby leads
              </p>
            </div>
          </div>
        )}

        {/* Leads List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-20">
            <AlertCircle className="mx-auto text-muted-foreground mb-4" size={48} />
            <h3 className="text-lg font-semibold text-foreground">{t('noLeads')}</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Check back later or expand your service radius
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate('/profile')}
            >
              <MapPin size={18} />
              Adjust Radius
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {leads.length} {leads.length === 1 ? 'lead' : 'leads'} in your area
            </p>
            
            {leads.map((lead, index) => (
              <div
                key={lead.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <LeadCard
                  lead={lead}
                  distance={lead.distance}
                  isSubscribed={profile?.is_subscribed || false}
                  onViewDetails={() => handleViewDetails(lead)}
                  onAccept={() => handleAcceptLead(lead)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lead Details Modal */}
      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-sm mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t('viewDetails')}</DialogTitle>
            <DialogDescription>
              Full lead details
            </DialogDescription>
          </DialogHeader>
          
          {selectedLead && (
            <div className="space-y-4 py-4">
              <div className="flex items-start gap-3">
                <MapPin className="text-primary mt-1" size={20} />
                <div>
                  <p className="text-sm font-medium text-foreground">Location</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedLead.location_address || 'No address provided'}
                  </p>
                </div>
              </div>

              {selectedLead.customer_name && (
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center mt-1">
                    <span className="text-xs font-medium">
                      {selectedLead.customer_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Customer</p>
                    <p className="text-sm text-muted-foreground">{selectedLead.customer_name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <a
                  href={`tel:${selectedLead.customer_phone}`}
                  className="flex-1"
                >
                  <Button variant="outline" className="w-full">
                    {t('call')} {selectedLead.customer_phone}
                  </Button>
                </a>
              </div>

              <Button
                variant="hero"
                className="w-full"
                onClick={() => handleAcceptLead(selectedLead)}
                disabled={acceptingLead}
              >
                {acceptingLead ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  t('acceptLead')
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Subscribe Modal */}
      <Dialog open={showSubscribeModal} onOpenChange={setShowSubscribeModal}>
        <DialogContent className="max-w-sm mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="text-secondary" size={24} />
              {t('subscribeNow')}
            </DialogTitle>
            <DialogDescription>
              {t('subscribeToView')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 text-center">
            <div className="text-4xl font-bold text-foreground">₹500</div>
            <div className="text-muted-foreground">{t('perMonth')}</div>
            
            <ul className="mt-6 space-y-3 text-left">
              <li className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center">✓</div>
                View full lead details
              </li>
              <li className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center">✓</div>
                Accept unlimited leads
              </li>
              <li className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center">✓</div>
                Priority notifications
              </li>
            </ul>

            <Button
              variant="heroSecondary"
              className="w-full mt-6"
              onClick={() => {
                // Open WhatsApp for payment
                window.open('https://wa.me/919999999999?text=I%20want%20to%20subscribe%20to%20LEADX', '_blank');
                setShowSubscribeModal(false);
              }}
            >
              {t('subscribeNow')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default GetLeads;
