import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, User, FileText, Loader2, CheckCircle, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import LocationPicker from '@/components/LocationPicker';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

type ServiceType = 'rent_agreement' | 'domicile' | 'income_certificate' | 'birth_certificate' | 'death_certificate' | 'other';

const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, 'Enter valid 10-digit phone number');

const GenerateLead: React.FC = () => {
  const [serviceType, setServiceType] = useState<ServiceType>('rent_agreement');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLocationChange = (lat: number, lng: number, addr?: string) => {
    setLatitude(lat);
    setLongitude(lng);
    if (addr) setAddress(addr);
  };

  const validatePhone = (phone: string) => {
    try {
      phoneSchema.parse(phone);
      setPhoneError('');
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setPhoneError(e.errors[0].message);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePhone(customerPhone)) return;
    if (!latitude || !longitude) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: 'Please set a location for this lead',
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('leads').insert({
      created_by_user_id: user?.id,
      service_type: serviceType,
      location_lat: latitude,
      location_long: longitude,
      location_address: address,
      customer_name: customerName || null,
      customer_phone: customerPhone,
      notes: notes || null,
      status: 'open',
    });

    setLoading(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: 'Failed to create lead. Please try again.',
      });
    } else {
      toast({
        title: t('success'),
        description: t('leadCreated'),
      });
      navigate('/dashboard');
    }
  };

  const canSubmit = customerPhone.length === 10 && latitude !== null && longitude !== null;

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t('generateLead')} showBack />

      <main className="px-4 py-6 max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Service Type */}
          <div className="space-y-2 animate-slide-up">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText size={18} className="text-primary" />
              {t('serviceType')}
            </label>
            <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceType)}>
              <SelectTrigger className="h-14 text-base rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rent_agreement">{t('rentAgreement')}</SelectItem>
                <SelectItem value="domicile">{t('domicile')}</SelectItem>
                <SelectItem value="income_certificate">{t('incomeCertificate')}</SelectItem>
                <SelectItem value="birth_certificate">{t('birthCertificate')}</SelectItem>
                <SelectItem value="death_certificate">{t('deathCertificate')}</SelectItem>
                <SelectItem value="other">{t('other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              onLocationChange={handleLocationChange}
            />
          </div>

          {/* Customer Name */}
          <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <User size={18} className="text-primary" />
              {t('customerName')} (Optional)
            </label>
            <Input
              type="text"
              placeholder="Customer name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="h-14 text-base rounded-xl"
            />
          </div>

          {/* Customer Phone */}
          <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Phone size={18} className="text-primary" />
              {t('customerPhone')} *
            </label>
            <Input
              type="tel"
              placeholder="10-digit phone number"
              value={customerPhone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setCustomerPhone(val);
                if (val.length === 10) validatePhone(val);
                else setPhoneError('');
              }}
              className="h-14 text-base rounded-xl"
            />
            {phoneError && <p className="text-destructive text-sm">{phoneError}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-2 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText size={18} className="text-primary" />
              {t('notes')} (Optional)
            </label>
            <Textarea
              placeholder="Any additional details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] text-base rounded-xl"
            />
          </div>

          {/* Photo Upload Placeholder */}
          <div className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <button
              type="button"
              className="w-full h-24 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Camera size={24} />
              <span className="text-sm">{t('uploadPhoto')} (Optional)</span>
            </button>
          </div>

          {/* Submit */}
          <div className="pt-4 animate-slide-up" style={{ animationDelay: '0.6s' }}>
            <Button
              type="submit"
              variant="hero"
              className="w-full"
              disabled={!canSubmit || loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={24} />
              ) : (
                <>
                  <CheckCircle size={20} />
                  <span>{t('submit')}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </main>

      <BottomNav />
    </div>
  );
};

export default GenerateLead;
