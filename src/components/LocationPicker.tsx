import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Crosshair, Loader2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import MapPreview from './MapPreview';

const MAPTILER_KEY = 'vUJcqBljtTjPDAM96UaW';

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  radius?: number; // km
  onLocationChange: (lat: number, lng: number, address?: string) => void;
}


interface Suggestion {
  id: string;
  place_name: string;
  center: [number, number];
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  latitude,
  longitude,
  radius,
  onLocationChange,
}) => {

  const { t } = useLanguage();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Track location search in backend
  const trackLocationSearch = async (query: string, selectedLocation?: { lat: number; lng: number; address: string }) => {
    try {
      // Log the search for analytics - can be used for improving suggestions later
      console.log('Location search tracked:', { query, selectedLocation });
      // You can add a Supabase insert here to track searches if needed
    } catch (error) {
      console.error('Error tracking location search:', error);
    }
  };

  // Fetch suggestions from MapTiler Geocoding API
  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setSearching(true);
    try {
      // Focus on India for better local results
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_KEY}&country=in&limit=5`
      );
      const data = await response.json();
      
      if (data.features) {
        const formattedSuggestions: Suggestion[] = data.features.map((feature: any) => ({
          id: feature.id,
          place_name: feature.place_name,
          center: feature.center,
        }));
        setSuggestions(formattedSuggestions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.length >= 2) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(searchQuery);
        trackLocationSearch(searchQuery);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  const handleSuggestionSelect = (suggestion: Suggestion) => {
    const [lng, lat] = suggestion.center;
    setAddress(suggestion.place_name);
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    onLocationChange(lat, lng, suggestion.place_name);
    
    // Track the selected location
    trackLocationSearch(searchQuery, { lat, lng, address: suggestion.place_name });
    
    toast({
      title: t('success'),
      description: 'Location selected successfully',
    });
  };

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
        
        // Get address from MapTiler reverse geocoding
        try {
          const response = await fetch(
            `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}`
          );
          const data = await response.json();
          const addr = data.features?.[0]?.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
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

  // Handle location change from map drag
  const handleMapLocationChange = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}`
      );
      const data = await response.json();
      const addr = data.features?.[0]?.place_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setAddress(addr);
      onLocationChange(lat, lng, addr);
    } catch {
      onLocationChange(lat, lng);
    }
  };

  const clearLocation = () => {
    setAddress('');
    setSearchQuery('');
    setSuggestions([]);
  };

  useEffect(() => {
    if (latitude && longitude && !address) {
      // Reverse geocode to get address
      fetch(`https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=${MAPTILER_KEY}`)
        .then(res => res.json())
        .then(data => {
          if (data.features?.[0]) {
            setAddress(data.features[0].place_name);
          } else {
            setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
        })
        .catch(() => {
          setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        });
    }
  }, [latitude, longitude, address]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <MapPin size={18} className="text-primary" />
        <span>{t('location')}</span>
      </div>

      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search location (e.g., Katraj, Pune)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            className="pl-10 pr-10 h-12 rounded-xl border-border bg-background"
          />
          {(searchQuery || searching) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {searching ? (
                <Loader2 size={18} className="animate-spin text-muted-foreground" />
              ) : (
                <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
                  <X size={18} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionSelect(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border last:border-b-0 flex items-start gap-3"
              >
                <MapPin size={16} className="text-primary mt-0.5 flex-shrink-0" />
                <span className="text-sm text-foreground line-clamp-2">{suggestion.place_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Current Location Button */}
      <Button
        type="button"
        variant="outline"
        className="w-full h-12 rounded-xl"
        onClick={getCurrentLocation}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin mr-2" />
            <span>Detecting location...</span>
          </>
        ) : (
          <>
            <Crosshair size={20} className="mr-2" />
            <span>{t('setLocation')}</span>
          </>
        )}
      </Button>

      {/* Map Preview with Draggable Pin */}
      {latitude && longitude && (
        <div className="space-y-3">
          <MapPreview
  latitude={latitude}
  longitude={longitude}
  radius={radius}
  onLocationChange={handleMapLocationChange}
  draggable={true}
/>

          
          {/* Selected Location Display */}
          {address && (
            <div className="bg-primary/10 rounded-xl p-4 border border-primary/20">
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={16} className="text-primary" />
                    <p className="text-sm font-medium text-foreground">Selected Location</p>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{address}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearLocation}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
