import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, MapPin, Clock, CheckCircle, XCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { getDaysUntilExpiry, isLeadAboutToExpire } from '@/lib/auto-rejection';

interface Lead {
  id: string;
  service_type: string;
  location_address: string | null;
  customer_name: string | null;
  customer_phone: string;
  status: string;
  created_at: string;
  claimed_at: string | null;
}

const serviceTypeLabels: Record<string, string> = {
  rent_agreement: 'rentAgreement',
  domicile: 'domicile',
  income_certificate: 'incomeCertificate',
  birth_certificate: 'birthCertificate',
  death_certificate: 'deathCertificate',
  other: 'other',
};

const statusConfig: Record<string, { icon: React.ElementType; color: string }> = {
  open: { icon: AlertCircle, color: 'text-secondary' },
  claimed: { icon: CheckCircle, color: 'text-primary' },
  completed: { icon: CheckCircle, color: 'text-primary' },
  cancelled: { icon: XCircle, color: 'text-destructive' },
};

const History: React.FC = () => {
  const navigate = useNavigate();
  const [myLeads, setMyLeads] = useState<Lead[]>([]);
  const [claimedLeads, setClaimedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;

      setLoading(true);

      // Fetch leads I created
      const { data: created } = await supabase
        .from('leads')
        .select('*')
        .eq('created_by_user_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch leads I claimed
      const { data: claimed } = await supabase
        .from('leads')
        .select('*')
        .eq('claimed_by_user_id', user.id)
        .order('claimed_at', { ascending: false });

      setMyLeads(created || []);
      setClaimedLeads(claimed || []);
      setLoading(false);
    };

    fetchHistory();
  }, [user]);

  const renderLeadItem = (lead: Lead, showClaimed = false) => {
    const StatusIcon = statusConfig[lead.status]?.icon || AlertCircle;
    const statusColor = statusConfig[lead.status]?.color || 'text-muted-foreground';
    const daysRemaining = lead.status === 'claimed' ? getDaysUntilExpiry(lead.claimed_at) : null;
    const aboutToExpire = lead.status === 'claimed' && isLeadAboutToExpire(lead.claimed_at);

    return (
      <button
        key={lead.id}
        onClick={() => navigate(`/lead/${lead.id}`)}
        className="w-full text-left bg-card border border-border rounded-xl p-4 animate-fade-in hover:border-primary transition-colors"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-accent text-accent-foreground">
            {t(serviceTypeLabels[lead.service_type] || 'other')}
          </span>
          <div className={cn("flex items-center gap-1 text-sm font-medium", statusColor)}>
            <StatusIcon size={16} />
            <span>{t(lead.status)}</span>
          </div>
        </div>

        {/* Expiry Warning */}
        {aboutToExpire && daysRemaining !== null && (
          <div className="mb-3 flex items-center gap-2 text-xs bg-destructive/10 text-destructive px-2 py-1.5 rounded-lg">
            <AlertTriangle size={14} />
            <span>
              {daysRemaining > 0 
                ? `Expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
                : 'Expires today'}
            </span>
          </div>
        )}

        {/* Location */}
        <div className="flex items-start gap-2 mb-3">
          <MapPin size={16} className="text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            {lead.location_address || 'Location not specified'}
          </p>
        </div>

        {/* Customer */}
        {lead.customer_name && (
          <p className="text-sm font-medium text-foreground mb-2">
            {lead.customer_name}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock size={14} />
            <span>
              {showClaimed && lead.claimed_at
                ? `Claimed ${formatDistanceToNow(new Date(lead.claimed_at))} ${t('ago')}`
                : `${formatDistanceToNow(new Date(lead.created_at))} ${t('ago')}`}
            </span>
          </div>
          <span className="text-xs text-primary font-medium">View Details →</span>
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t('history')} />

      <main className="px-4 py-6 max-w-md mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="claimed" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="claimed" className="rounded-lg">
                Accepted ({claimedLeads.length})
              </TabsTrigger>
              <TabsTrigger value="created" className="rounded-lg">
                Posted ({myLeads.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="claimed" className="space-y-4">
              {claimedLeads.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="mx-auto text-muted-foreground mb-4" size={48} />
                  <p className="text-muted-foreground">No accepted leads yet</p>
                </div>
              ) : (
                claimedLeads.map((lead) => renderLeadItem(lead, true))
              )}
            </TabsContent>

            <TabsContent value="created" className="space-y-4">
              {myLeads.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="mx-auto text-muted-foreground mb-4" size={48} />
                  <p className="text-muted-foreground">No leads posted yet</p>
                </div>
              ) : (
                myLeads.map((lead) => renderLeadItem(lead))
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default History;
