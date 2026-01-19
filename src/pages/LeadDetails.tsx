import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  MapPin, Phone, Clock, User, FileText, CheckCircle, XCircle, 
  Camera, Loader2, MessageSquare, Upload, MessageCircle, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { completeLead, rejectLead } from '@/lib/lead-actions';
import { openWhatsApp, generateLeadWhatsAppMessage } from '@/lib/whatsapp';
import { triggerLeadNotification } from '@/lib/notifications';
import { getDaysUntilExpiry, isLeadAboutToExpire } from '@/lib/auto-rejection';
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
  lead_generator_phone: string | null;
  status: string;
  created_at: string;
  claimed_at: string | null;
  notes: string | null;
  special_instructions: string | null;
  proof_url: string | null;
  created_by_user_id: string;
  claimed_by_user_id: string | null;
}

const serviceTypeLabels: Record<string, string> = {
  rent_agreement: 'rentAgreement',
  domicile: 'domicile',
  income_certificate: 'incomeCertificate',
  birth_certificate: 'birthCertificate',
  death_certificate: 'deathCertificate',
  other: 'other',
};

const LeadDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [generatorPhone, setGeneratorPhone] = useState('');

  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !id) {
      navigate('/auth');
      return;
    }
    fetchLead();
  }, [user, id, navigate]);

  const fetchLead = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: 'Lead not found',
      });
      navigate('/history');
      return;
    }

    setLead(data);
    
    // Fetch generator profile for phone
    if (data.created_by_user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('phone')
        .eq('id', data.created_by_user_id)
        .maybeSingle();
      
      if (profile?.phone) {
        setGeneratorPhone(profile.phone);
      }
    }
    
    setLoading(false);
  };

  const isGenerator = lead?.created_by_user_id === user?.id;
  const isClaimer = lead?.claimed_by_user_id === user?.id;
  const daysRemaining = getDaysUntilExpiry(lead?.claimed_at || null);
  const aboutToExpire = isLeadAboutToExpire(lead?.claimed_at || null);

  const handleRejectLead = async () => {
    if (!lead || !user) return;

    setActionLoading(true);

    const { success, error } = await rejectLead(lead.id);

    setActionLoading(false);

    if (!success) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error || 'Failed to reject lead',
      });
    } else {
      // Notify the appropriate party
      if (isClaimer && lead.created_by_user_id) {
        // Notify lead generator that agent rejected the lead
        await triggerLeadNotification(lead.created_by_user_id, 'lead_rejected', {
          leadId: lead.id,
          serviceType: lead.service_type,
        });
      } else if (isGenerator && lead.claimed_by_user_id) {
        // Notify agent that generator took back the lead
        await triggerLeadNotification(lead.claimed_by_user_id, 'recalled', {
          id: lead.id,
          service_type: lead.service_type,
        });
      }

      toast({
        title: t('success'),
        description: isClaimer ? 'Lead released back to available' : 'Lead retrieved successfully',
      });
      setShowRejectModal(false);
      navigate('/history');
    }
  };

  const handleCompleteLead = async () => {
    if (!lead || !user || !proofFile) return;

    setActionLoading(true);

    try {
      // Upload proof image
      const fileExt = proofFile.name.split('.').pop();
      const filePath = `proofs/${lead.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('lead-proofs')
        .upload(filePath, proofFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('lead-proofs')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL for uploaded proof');
      }

      // Use the completeLead utility function
      const { success, error } = await completeLead(
        lead.id,
        urlData.publicUrl,
        generatorPhone
      );

      if (!success) {
        throw new Error(error || 'Failed to update lead status');
      }

      // Notify lead generator
      if (lead.created_by_user_id) {
        await triggerLeadNotification(lead.created_by_user_id, 'lead_completed', {
          leadId: lead.id,
          serviceType: lead.service_type,
          claimedBy: user.user_metadata?.name || 'User',
        });
      }

      toast({
        title: t('success'),
        description: 'Lead completed successfully!',
      });
      setShowCompleteModal(false);
      setProofFile(null);
      navigate('/history');

    } catch (error) {
      console.error('Complete error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to complete lead';
      toast({
        variant: 'destructive',
        title: t('error'),
        description: errorMessage,
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openWhatsAppChat = (phone: string, isGenerator: boolean) => {
    const message = generateLeadWhatsAppMessage(
      lead?.id || '',
      user?.user_metadata?.name || 'User',
      lead?.service_type || 'service'
    );
    openWhatsApp(phone, message);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) return null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Lead Details" showBack />

      <main className="px-4 py-6 max-w-md mx-auto space-y-4">
        {/* Expiry Warning */}
        {(isClaimer || isGenerator) && lead.status === 'claimed' && daysRemaining !== null && (
          <div className={`rounded-2xl p-4 flex items-start gap-3 ${
            aboutToExpire 
              ? 'bg-destructive/10 border border-destructive/30' 
              : 'bg-secondary/10 border border-secondary/30'
          }`}>
            <AlertTriangle 
              className={aboutToExpire ? 'text-destructive' : 'text-secondary'} 
              size={20} 
            />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {daysRemaining > 0 
                  ? `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`
                  : 'Lead expires today'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isClaimer 
                  ? 'Complete this lead or it will be automatically released.'
                  : 'This lead will be automatically released if not completed in time.'}
              </p>
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
          lead.status === 'completed' ? 'bg-primary/20 text-primary' :
          lead.status === 'claimed' ? 'bg-secondary/20 text-secondary' :
          lead.status === 'open' ? 'bg-accent text-accent-foreground' :
          'bg-destructive/20 text-destructive'
        }`}>
          {lead.status === 'completed' ? <CheckCircle size={16} /> : 
           lead.status === 'claimed' ? <Clock size={16} /> :
           <FileText size={16} />}
          {t(lead.status)}
        </div>

        {/* Service Type Card */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <FileText className="text-primary" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {t(serviceTypeLabels[lead.service_type] || 'other')}
              </h2>
              <p className="text-sm text-muted-foreground">
                Created {formatDistanceToNow(new Date(lead.created_at))} {t('ago')}
              </p>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <MapPin className="text-primary mt-1 shrink-0" size={20} />
            <div>
              <h3 className="font-semibold text-foreground">{t('location')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {lead.location_address || 'No address provided'}
              </p>
            </div>
          </div>
        </div>

        {/* Customer Info - Only for claimer or generator */}
        {(isClaimer || isGenerator) && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <User size={18} className="text-primary" />
              Customer Details
            </h3>
            
            {lead.customer_name && (
              <p className="text-sm text-foreground">{lead.customer_name}</p>
            )}
            
            {/* Customer phone only for generator */}
            {isGenerator && (
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-muted-foreground" />
                <span className="text-sm">{lead.customer_phone}</span>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {lead.notes && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="font-semibold text-foreground mb-2">Notes</h3>
            <p className="text-sm text-muted-foreground">{lead.notes}</p>
          </div>
        )}

        {/* Special Instructions */}
        {lead.special_instructions && (
          <div className="bg-secondary/10 border border-secondary/30 rounded-2xl p-4">
            <h3 className="font-semibold text-foreground mb-2">Special Instructions</h3>
            <p className="text-sm text-muted-foreground">{lead.special_instructions}</p>
          </div>
        )}

        {/* Proof Image */}
        {lead.proof_url && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="font-semibold text-foreground mb-2">Proof of Completion</h3>
            <img 
              src={lead.proof_url} 
              alt="Proof" 
              className="w-full rounded-xl"
            />
          </div>
        )}

        {/* Actions for Claimer */}
        {isClaimer && lead.status === 'claimed' && (
          <div className="space-y-3 pt-4">
            {/* Chat with Generator */}
            {generatorPhone && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => openWhatsAppChat(generatorPhone, true)}
              >
                <MessageSquare size={18} />
                Chat with Lead Generator
              </Button>
            )}

            {/* Complete Lead */}
            <Button
              variant="hero"
              className="w-full"
              onClick={() => setShowCompleteModal(true)}
            >
              <CheckCircle size={18} />
              Complete Lead
            </Button>

            {/* Reject Lead */}
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setShowRejectModal(true)}
            >
              <XCircle size={18} />
              Reject / Cancel
            </Button>
          </div>
        )}

        {/* Actions for Generator */}
        {isGenerator && lead.status === 'claimed' && lead.claimed_by_user_id && (
          <div className="space-y-3 pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                const { data } = await supabase
                  .from('profiles')
                  .select('phone')
                  .eq('id', lead.claimed_by_user_id!)
                  .maybeSingle();
                
                if (data?.phone) {
                  openWhatsAppChat(data.phone, false);
                }
              }}
            >
              <MessageSquare size={18} />
              Chat with Agent
            </Button>

            {/* Get Back Lead */}
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setShowRejectModal(true)}
            >
              <XCircle size={18} />
              Get Back Lead
            </Button>
          </div>
        )}
      </main>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-sm mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>{isClaimer ? 'Reject Lead?' : 'Get Back Lead?'}</DialogTitle>
            <DialogDescription>
              {isClaimer 
                ? 'This lead will go back to available status and can be claimed by others.'
                : 'This will release the lead from the current agent and make it available for others to claim.'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowRejectModal(false)}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleRejectLead}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="animate-spin" size={18} /> : (isClaimer ? 'Reject' : 'Get Back')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete Modal */}
      <Dialog open={showCompleteModal} onOpenChange={setShowCompleteModal}>
        <DialogContent className="max-w-sm mx-4 rounded-2xl">
          <DialogHeader>
            <DialogTitle>Complete Lead</DialogTitle>
            <DialogDescription>
              Upload proof (receipt, document, or photo) to mark this lead as completed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              />
              {proofFile ? (
                <div className="text-center">
                  <CheckCircle className="mx-auto text-primary mb-2" size={32} />
                  <p className="text-sm text-foreground">{proofFile.name}</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto text-muted-foreground mb-2" size={32} />
                  <p className="text-sm text-muted-foreground">Click to upload proof</p>
                </div>
              )}
            </label>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowCompleteModal(false);
                setProofFile(null);
              }}
            >
              {t('cancel')}
            </Button>
            <Button
              variant="hero"
              className="flex-1"
              onClick={handleCompleteLead}
              disabled={actionLoading || !proofFile}
            >
              {actionLoading ? <Loader2 className="animate-spin" size={18} /> : 'Complete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default LeadDetails;
