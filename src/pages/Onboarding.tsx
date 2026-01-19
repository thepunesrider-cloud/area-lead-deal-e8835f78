import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LocationPicker from '@/components/LocationPicker';
import RadiusSlider from '@/components/RadiusSlider';
import LanguageToggle from '@/components/LanguageToggle';
import { useToast } from '@/hooks/use-toast';

type ServiceType = 'rent_agreement' | 'domicile' | 'income_certificate' | 'birth_certificate' | 'death_certificate' | 'other';

const Onboarding: React.FC = () => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('rent_agreement');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [radius, setRadius] = useState(10);
  const [loading, setLoading] = useState(false);

  const { updateProfile, profile, user, signOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  // If user is not authenticated, redirect to auth page
  React.useEffect(() => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: 'Please sign in again to continue.',
      });
      navigate('/auth');
    }
  }, [user, navigate, toast, t]);

  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleComplete = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: 'Please sign in again to continue.',
      });
      navigate('/auth');
      return;
    }

    setLoading(true);

    const { error } = await updateProfile({
      name: name || profile?.name || '',
      service_type: serviceType,
      location_lat: latitude,
      location_long: longitude,
      service_radius_km: radius,
    });

    setLoading(false);

    if (error) {
      // Surface the Supabase error message to help debugging
      toast({
        variant: 'destructive',
        title: t('error'),
        description: error.message || 'Failed to save profile. Please try again.',
      });
      console.error('Profile update error:', error);
    } else {
      toast({
        title: t('success'),
        description: 'Profile set up successfully!',
      });
      navigate('/dashboard');
    }
  };

  const canProceedStep1 = name.trim().length >= 2;
  const canProceedStep2 = latitude !== null && longitude !== null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent to-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`w-8 h-2 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <LanguageToggle />
      </div>

      <div className="flex-1 px-6 py-8 max-w-md mx-auto w-full">
        {step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground">{t('welcome')}</h1>
              <p className="text-muted-foreground mt-2">{t('setupProfile')}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t('name')}
                </label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-14 text-base rounded-xl"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
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
            </div>

            <div className="pt-6">
              <Button
                variant="hero"
                className="w-full"
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
              >
                <span>{t('next')}</span>
                <ArrowRight size={20} />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-foreground">{t('setupLocation')}</h1>
              <p className="text-muted-foreground mt-2">Set your working area</p>
            </div>

            <LocationPicker
              latitude={latitude}
              longitude={longitude}
              onLocationChange={handleLocationChange}
            />

            {latitude && longitude && (
              <div className="animate-fade-in">
                <RadiusSlider
                  value={radius}
                  onChange={setRadius}
                  min={1}
                  max={50}
                />
              </div>
            )}

            <div className="flex gap-3 pt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                {t('back')}
              </Button>
              <Button
                variant="hero"
                className="flex-1"
                onClick={handleComplete}
                disabled={!canProceedStep2 || loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <CheckCircle size={20} />
                    <span>{t('getStarted')}</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
