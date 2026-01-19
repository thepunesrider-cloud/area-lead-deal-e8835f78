import React from 'react';
import { MapPin, Phone, Clock, Lock, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface LeadCardProps {
  lead: {
    id: string;
    service_type: string;
    location_address: string | null;
    customer_name: string | null;
    customer_phone: string;
    status: string;
    created_at: string;
  };
  distance?: number;
  isSubscribed: boolean;
  onViewDetails: () => void;
  onAccept: () => void;
}

const serviceTypeLabels: Record<string, string> = {
  rent_agreement: 'rentAgreement',
  domicile: 'domicile',
  income_certificate: 'incomeCertificate',
  birth_certificate: 'birthCertificate',
  death_certificate: 'deathCertificate',
  other: 'other',
};

const LeadCard: React.FC<LeadCardProps> = ({
  lead,
  distance,
  isSubscribed,
  onViewDetails,
  onAccept,
}) => {
  const { t } = useLanguage();

  const maskedPhone = isSubscribed 
    ? lead.customer_phone 
    : lead.customer_phone.slice(0, 6) + '*****';

  const displayAddress = isSubscribed
    ? lead.location_address
    : lead.location_address?.split(',')[0] + '...';

  const serviceLabel = t(serviceTypeLabels[lead.service_type] || 'other');

  return (
    <div className="bg-card rounded-2xl border border-border shadow-md p-4 animate-scale-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-accent text-accent-foreground">
            {serviceLabel}
          </span>
          <div className="flex items-center gap-1 mt-2 text-muted-foreground text-sm">
            <Clock size={14} />
            <span>{formatDistanceToNow(new Date(lead.created_at))} {t('ago')}</span>
          </div>
        </div>
        
        {distance !== undefined && (
          <div className="flex items-center gap-1 text-primary font-semibold">
            <MapPin size={16} />
            <span>{distance.toFixed(1)} {t('kmAway')}</span>
          </div>
        )}
      </div>

      {/* Location */}
      <div className="flex items-start gap-2 mb-3">
        <MapPin size={18} className="text-muted-foreground mt-0.5 shrink-0" />
        <p className={cn(
          "text-sm",
          !isSubscribed && "blur-sm select-none"
        )}>
          {displayAddress || 'Location details hidden'}
        </p>
      </div>

      {/* Customer Info */}
      <div className="flex items-center gap-2 mb-4">
        <Phone size={18} className="text-muted-foreground shrink-0" />
        <p className={cn(
          "text-sm font-medium",
          !isSubscribed && "blur-sm select-none"
        )}>
          {maskedPhone}
        </p>
        {!isSubscribed && (
          <Lock size={14} className="text-secondary" />
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isSubscribed ? (
          <>
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={onViewDetails}
            >
              {t('viewDetails')}
            </Button>
            <Button 
              variant="action" 
              className="flex-1"
              onClick={onAccept}
            >
              {t('acceptLead')}
              <ChevronRight size={18} />
            </Button>
          </>
        ) : (
          <Button 
            variant="actionSecondary" 
            className="w-full"
            onClick={onViewDetails}
          >
            <Lock size={18} />
            {t('subscribeToView')}
          </Button>
        )}
      </div>
    </div>
  );
};

export default LeadCard;
