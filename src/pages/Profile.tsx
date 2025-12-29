import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Star, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import LocationPicker from '@/components/LocationPicker';
import RadiusSlider from '@/components/RadiusSlider';
import { useToast } from '@/hooks/use-toast';

type ServiceType = 'rent_agreement' | 'domicile' | 'income_certificate' | 'birth_certificate' | 'death_certificate' | 'other';

const Profile: React.FC = () => {
  const { user, profile, signOut, updateProfile, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState('');
  const [serviceType, setServiceType] = useState<ServiceType>('rent_agreement');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [radius, setRadius] = useState(10);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setServiceType((profile.service_type as ServiceType) || 'rent_agreement');
      setLatitude(profile.location_lat);
      setLongitude(profile.location_long);
      setRadius(profile.service_radius_km || 10);
    }
  }, [profile]);

  const handleLocationChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);

    const { error } = await updateProfile({
      name,
      service_type: serviceType,
      location_lat: latitude,
      location_long: longitude,
      service_radius_km: radius,
    });

    setSaving(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: 'Failed to save profile',
      });
    } else {
      toast({
        title: t('success'),
        description: 'Profile saved successfully',
      });
      setHasChanges(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title={t('profile')} />

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Avatar & Subscription */}
        <div className="bg-card border border-border rounded-2xl p-6 text-center animate-slide-up">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={40} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{profile?.name || 'Agent'}</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          
          <div className={`inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-sm font-medium ${
            profile?.is_subscribed 
              ? 'bg-primary/10 text-primary' 
              : 'bg-secondary/10 text-secondary'
          }`}>
            <Star size={16} className={profile?.is_subscribed ? 'fill-primary' : ''} />
            <span>{profile?.is_subscribed ? t('premiumPlan') : t('freePlan')}</span>
          </div>
        </div>

        {/* Profile Form */}
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {t('name')}
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setHasChanges(true);
              }}
              className="h-14 text-base rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              {t('serviceType')}
            </label>
            <Select 
              value={serviceType} 
              onValueChange={(v) => {
                setServiceType(v as ServiceType);
                setHasChanges(true);
              }}
            >
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

        {/* Location Section */}
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <LocationPicker
            latitude={latitude}
            longitude={longitude}
            onLocationChange={handleLocationChange}
          />
        </div>

        {/* Radius Slider */}
        {latitude && longitude && (
          <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <RadiusSlider
              value={radius}
              onChange={(v) => {
                setRadius(v);
                setHasChanges(true);
              }}
              min={1}
              max={50}
            />
          </div>
        )}

        {/* Save Button */}
        {hasChanges && (
          <div className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <Button
              variant="hero"
              className="w-full"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Save size={20} />
                  <span>{t('saveProfile')}</span>
                </>
              )}
            </Button>
          </div>
        )}

        {/* Logout */}
        <div className="pt-4 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut size={18} />
            <span>{t('logout')}</span>
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
