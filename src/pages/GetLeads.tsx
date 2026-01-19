import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, MapPin, AlertCircle, Star, Loader2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import LeadCard from '@/components/LeadCard';
import LeadFilter from '@/components/LeadFilter';
import { useToast } from '@/hooks/use-toast';
import { createNotification, requestBrowserNotificationPermission, showBrowserNotification } from '@/lib/notifications';
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

interface Filters {
  serviceType?: string;
  minDistance?: number;
  maxDistance?: number;
  dateFrom?: string;
  dateTo?: string;
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
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [acceptingLead, setAcceptingLead] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const notifiedLeadIdsRef = useRef<Set<string>>(new Set());

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

  // Apply filters to leads
  useEffect(() => {
    let filtered = [...leads];

    if (filters.serviceType) {
      filtered = filtered.filter((lead) => lead.service_type === filters.serviceType);
    }

    if (filters.minDistance !== undefined) {
      filtered = filtered.filter((lead) => (lead.distance || 0) >= filters.minDistance!);
    }

    if (filters.maxDistance !== undefined) {
      filtered = filtered.filter((lead) => (lead.distance || 0) <= filters.maxDistance!);
    }

    if (filters.dateFrom) {
      const dateFrom = new Date(filters.dateFrom).getTime();
      filtered = filtered.filter((lead) => new Date(lead.created_at).getTime() >= dateFrom);
    }

    if (filters.dateTo) {
      const dateTo = new Date(filters.dateTo).getTime();
      filtered = filtered.filter((lead) => new Date(lead.created_at).getTime() <= dateTo);
    }

    setFilteredLeads(filtered);
  }, [leads, filters]);

  const activeFiltersCount = Object.keys(filters).filter(key => filters[key as keyof Filters] !== undefined).length;

  // Poll every minute to ensure users get notified about available leads nearby
  useEffect(() => {
    const shouldRun = user && profile?.location_lat && profile?.location_long;
    if (!shouldRun) return;

    const pollNearbyLeads = async () => {
      try {
        const { data, error } = await supabase
          .from('leads')
          .select('id, service_type, location_lat, location_long, created_by_user_id')
          .eq('status', 'open')
          .neq('created_by_user_id', user!.id);

        if (error || !data) return;

        const radius = profile?.service_radius_km || 50;

        data.forEach(async (lead) => {
          if (!lead.location_lat || !lead.location_long) return;

          const distanceKm = calculateDistance(
            profile.location_lat!,
            profile.location_long!,
            lead.location_lat,
            lead.location_long
          );

          if (distanceKm <= radius && !notifiedLeadIdsRef.current.has(lead.id)) {
            await createNotification(user!.id, {
              type: 'new_lead',
              title: 'New lead near you',
              body: `${lead.service_type.replace(/_/g, ' ')} available ${distanceKm.toFixed(1)} km away`,
              data: { leadId: lead.id, lead_id: lead.id },
            });

            notifiedLeadIdsRef.current.add(lead.id);

            showBrowserNotification(
              'New lead near you',
              `${lead.service_type.replace(/_/g, ' ')} is available`,
              {
                leadId: lead.id,
                url: `/lead/${lead.id}`,
              }
            );
          }
        });
      } catch (err) {
        console.error('Polling error', err);
      }
    };

    // Run immediately, then every minute
    pollNearbyLeads();
    const interval = setInterval(pollNearbyLeads, 60 * 1000);
    return () => clearInterval(interval);
  }, [user, profile?.location_lat, profile?.location_long, profile?.service_radius_km]);

  // Realtime subscription
  useEffect(() => {
    // Request browser notification permission once
    requestBrowserNotificationPermission();

    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
        },
        async (payload) => {
          // Always refresh list
          fetchLeads();

          // On new lead insert, notify if within radius and not created by me
          if (payload.eventType === 'INSERT' && payload.new) {
            const newLead = payload.new as Lead & { created_by_user_id?: string };
            const myId = user?.id;

            // Skip if I created it or no profile location
            if (!myId || newLead.created_by_user_id === myId) return;
            if (!profile?.location_lat || !profile?.location_long) return;

            const distanceKm = calculateDistance(
              profile.location_lat!,
              profile.location_long!,
              newLead.location_lat,
              newLead.location_long
            );

            const radius = profile.service_radius_km || 50;
            if (distanceKm <= radius) {
              // Persist notification entry
              await createNotification(myId, {
                type: 'new_lead',
                title: 'New lead near you',
                body: `${newLead.service_type.replace(/_/g, ' ')} available ${distanceKm.toFixed(1)} km away`,
                data: { leadId: newLead.id, lead_id: newLead.id },
              });

              notifiedLeadIdsRef.current.add(newLead.id);

              // Browser push notification
              showBrowserNotification('New lead near you', `${newLead.service_type.replace(/_/g, ' ')} is available`, {
                leadId: newLead.id,
                url: `/lead/${newLead.id}`,
              });
            }
          }
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
    const { data, error, count } = await supabase
      .from('leads')
      .update({
        status: 'claimed',
        claimed_by_user_id: user?.id,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', lead.id)
      .eq('status', 'open')
      .select('id')
      .maybeSingle();

    setAcceptingLead(false);

    // Check if update actually affected a row (count > 0 or data exists)
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
        {/* Filter Button */}
        <div className="mb-6">
          <LeadFilter onFiltersChange={setFilters} activeFiltersCount={activeFiltersCount} />
        </div>

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
        ) : filteredLeads.length === 0 ? (
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
              {filteredLeads.length} {filteredLeads.length === 1 ? 'lead' : 'leads'} found
            </p>
            
            {filteredLeads.map((lead, index) => (
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
                window.open('https://wa.me/918766759346?text=I%20want%20to%20subscribe%20to%20LEADX', '_blank');
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
