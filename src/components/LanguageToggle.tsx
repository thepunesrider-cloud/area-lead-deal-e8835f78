import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const LanguageToggle: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const languages = [
    { code: 'en' as const, label: 'EN' },
    { code: 'mr' as const, label: 'मर' },
    { code: 'hi' as const, label: 'हि' },
  ];

  return (
    <div className="flex items-center bg-muted rounded-full p-1 gap-0.5">
      {languages.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded-full transition-all duration-200",
            language === code
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
