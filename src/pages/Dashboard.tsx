import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Search, Star, Bell, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Lead {
  id: string;
  service_type: string;
  location_address: string | null;
  created_at: string;
  distance?: number;
}

const Dashboard: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const fetchRecentLeads = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id, service_type, location_address, location_lat, location_long, created_at')
        .eq('status', 'open')
        .neq('created_by_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(4);

      if (error) throw error;

      let leadsWithDistance: Lead[] = data || [];

      if (profile?.location_lat && profile?.location_long) {
        leadsWithDistance = leadsWithDistance.map((lead: any) => ({
          ...lead,
          distance: calculateDistance(
            profile.location_lat!,
            profile.location_long!,
            lead.location_lat,
            lead.location_long
          ),
        }));
      }

      setRecentLeads(leadsWithDistance);
    } catch (error) {
      console.error('Error fetching recent leads:', error);
    } finally {
      setLoadingLeads(false);
    }
  }, [user, profile]);

  const handleGetLead = (lead: Lead) => {
    if (!profile?.location_lat || !profile?.location_long) {
      toast({
        variant: 'destructive',
        title: 'Location not set',
        description: 'Please set your location in Profile to get leads',
      });
      return;
    }

    const serviceRadius = profile.service_radius_km || 50;
    
    if (lead.distance && lead.distance > serviceRadius) {
      toast({
        variant: 'destructive',
        title: 'Out of service area',
        description: `This lead is ${lead.distance.toFixed(1)} km away. Your service radius is ${serviceRadius} km.`,
      });
      return;
    }

    navigate(`/lead/${lead.id}`);
  };

  const formatServiceType = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRecentLeads();
    }
  }, [user, fetchRecentLeads]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        rightElement={
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative"
            onClick={() => navigate('/notifications')}
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full" />
          </Button>
        }
      />

      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Welcome Section */}
        <div className="mb-8 animate-slide-up">
          <p className="text-muted-foreground text-sm">{greeting()}</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">
            {profile?.name || 'Agent'}
          </h1>
          
          {/* Subscription Badge */}
          <div className={`inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full text-sm font-medium ${
            profile?.is_subscribed 
              ? 'bg-primary/10 text-primary' 
              : 'bg-secondary/10 text-secondary'
          }`}>
            <Star size={16} className={profile?.is_subscribed ? 'fill-primary' : ''} />
            <span>{profile?.is_subscribed ? t('premiumPlan') : t('freePlan')}</span>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="space-y-4">
          {/* Generate Lead Button */}
          <button
            onClick={() => navigate('/generate-lead')}
            className="w-full group animate-fade-in"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="bg-primary text-primary-foreground rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02] group-active:scale-[0.98]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary-foreground/20 rounded-2xl flex items-center justify-center">
                  <PlusCircle size={32} />
                </div>
                <div className="text-left flex-1">
                  <h2 className="text-xl font-bold">{t('generateLead')}</h2>
                  <p className="text-primary-foreground/80 text-sm mt-1">
                    {t('postJob')}
                  </p>
                </div>
              </div>
            </div>
          </button>

          {/* Get Leads Button */}
          <button
            onClick={() => navigate('/get-leads')}
            className="w-full group animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="bg-secondary text-secondary-foreground rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02] group-active:scale-[0.98]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-secondary-foreground/20 rounded-2xl flex items-center justify-center">
                  <Search size={32} />
                </div>
                <div className="text-left flex-1">
                  <h2 className="text-xl font-bold">{t('getLeads')}</h2>
                  <p className="text-secondary-foreground/80 text-sm mt-1">
                    {t('findWork')}
                  </p>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Recent Leads Preview - Blurred FIFO */}
        <div className="mt-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Leads</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/get-leads')}
              className="text-primary"
            >
              View All
            </Button>
          </div>

          <div className="space-y-3">
            {loadingLeads ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentLeads.length === 0 ? (
              <div className="bg-card border border-border rounded-2xl p-6 text-center">
                <p className="text-muted-foreground text-sm">No leads available yet</p>
              </div>
            ) : (
              recentLeads.map((lead, index) => (
                <div
                  key={lead.id}
                  className="bg-card border border-border rounded-2xl p-4 relative overflow-hidden cursor-pointer hover:border-primary/50 transition-all"
                  onClick={() => handleGetLead(lead)}
                  style={{
                    animationDelay: `${index * 0.1}s`,
                  }}
                >
                  {/* Blur overlay */}
                  <div className="absolute inset-0 backdrop-blur-[2px] bg-background/30 z-10 pointer-events-none" />
                  
                  <div className="relative z-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <PlusCircle className="text-primary" size={16} />
                        </div>
                        <span className="font-semibold text-foreground">
                          {formatServiceType(lead.service_type)}
                        </span>
                      </div>
                      {lead.distance !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {lead.distance.toFixed(1)} km
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                      <MapPin size={14} />
                      <span className="truncate">
                        {lead.location_address || 'Location not specified'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={12} />
                      <span>
                        {formatDistanceToNow(new Date(lead.created_at))} ago
                      </span>
                    </div>
                  </div>

                  {/* Get Lead Button - Visible above blur */}
                  <div className="absolute bottom-3 right-3 z-20">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-primary text-primary-foreground text-xs px-3 py-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGetLead(lead);
                      }}
                    >
                      Get Lead
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Stats */}
        {!profile?.is_subscribed && (
          <div className="mt-8 bg-card rounded-2xl border border-border p-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
                <Star className="text-secondary" size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t('unlockLeads')}</p>
                <p className="text-xs text-muted-foreground">₹500{t('perMonth')}</p>
              </div>
              <Button 
                variant="actionSecondary" 
                size="sm"
                onClick={() => navigate('/subscribe')}
              >
                {t('subscribeNow')}
              </Button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
