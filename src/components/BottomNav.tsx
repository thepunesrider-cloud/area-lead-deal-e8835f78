import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, History, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

const BottomNav: React.FC = () => {
  const location = useLocation();
  const { t } = useLanguage();

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'home' },
    { path: '/history', icon: History, label: 'history' },
    { path: '/profile', icon: User, label: 'profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 min-w-[64px] py-2 px-3 rounded-xl transition-all duration-200",
                isActive 
                  ? "text-primary bg-accent" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon 
                size={24} 
                className={cn(
                  "transition-transform duration-200",
                  isActive && "scale-110"
                )} 
              />
              <span className="text-xs font-medium">{t(label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
