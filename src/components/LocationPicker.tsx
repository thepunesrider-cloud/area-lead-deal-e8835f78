import React, { useState, useEffect } from 'react';
import { MapPin, Crosshair, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  onLocationChange: (lat: number, lng: number, address?: string) => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  onLocationChange,
}) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string>('');

  const getCurrentLocation = () => {
    setLoading(true);
    
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: 'Geolocation is not supported by your browser',
      });
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        
        // Try to get address from coordinates using a simple reverse geocoding
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
          );
          const data = await response.json();
          const addr = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          setAddress(addr);
          onLocationChange(lat, lng, addr);
        } catch {
          onLocationChange(lat, lng);
        }
        
        setLoading(false);
        toast({
          title: t('success'),
          description: 'Location detected successfully',
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast({
          variant: 'destructive',
          title: t('error'),
          description: 'Unable to get your location. Please enable location access.',
        });
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (latitude && longitude && !address) {
      setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
    }
  }, [latitude, longitude, address]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MapPin size={18} className="text-primary" />
        <span>{t('location')}</span>
      </div>

      <div className="bg-muted/50 rounded-xl p-4 border border-border">
        {latitude && longitude ? (
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium text-foreground truncate">
                {address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {latitude.toFixed(6)}, {longitude.toFixed(6)}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Crosshair size={16} />
              )}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="action"
            className="w-full"
            onClick={getCurrentLocation}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>Detecting location...</span>
              </>
            ) : (
              <>
                <Crosshair size={20} />
                <span>{t('setLocation')}</span>
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default LocationPicker;
