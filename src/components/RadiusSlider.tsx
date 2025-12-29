import React from 'react';
import { Slider } from '@/components/ui/slider';
import { useLanguage } from '@/contexts/LanguageContext';
import { MapPin } from 'lucide-react';

interface RadiusSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

const RadiusSlider: React.FC<RadiusSliderProps> = ({
  value,
  onChange,
  min = 1,
  max = 50,
}) => {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <MapPin size={18} className="text-primary" />
          <span>{t('serviceRadius')}</span>
        </div>
        <div className="flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full">
          <span className="text-lg font-bold">{value}</span>
          <span className="text-sm">km</span>
        </div>
      </div>

      <div className="relative px-2">
        <Slider
          value={[value]}
          onValueChange={(values) => onChange(values[0])}
          min={min}
          max={max}
          step={1}
          className="w-full"
        />
        
        {/* Visual radius indicator */}
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{min} km</span>
          <span>{Math.floor(max / 2)} km</span>
          <span>{max} km</span>
        </div>
      </div>

      {/* Visual circle representation */}
      <div className="flex items-center justify-center py-4">
        <div className="relative">
          <div 
            className="rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center transition-all duration-300"
            style={{
              width: `${Math.min(100 + value * 2, 200)}px`,
              height: `${Math.min(100 + value * 2, 200)}px`,
            }}
          >
            <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
          </div>
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
            Your service area
          </div>
        </div>
      </div>
    </div>
  );
};

export default RadiusSlider;
