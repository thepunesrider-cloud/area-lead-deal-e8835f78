import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';

const Index: React.FC = () => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent via-background to-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-end p-4">
        <LanguageToggle />
      </div>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Logo */}
        <div className="animate-float mb-8">
          <div className="w-28 h-28 bg-primary rounded-3xl flex items-center justify-center shadow-glow-primary">
            <span className="text-4xl font-extrabold text-primary-foreground">LX</span>
          </div>
        </div>

        {/* Title */}
        <div className="animate-slide-up">
          <h1 className="text-5xl font-extrabold text-foreground tracking-tight">
            LEAD<span className="text-primary">X</span>
          </h1>
          <p className="text-xl text-muted-foreground mt-3 max-w-xs mx-auto">
            {t('tagline')}
          </p>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-2 gap-4 w-full max-w-sm animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <div className="bg-card/80 backdrop-blur border border-border rounded-2xl p-4 text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-sm font-medium text-foreground">{t('generateLead')}</p>
          </div>
          <div className="bg-card/80 backdrop-blur border border-border rounded-2xl p-4 text-center">
            <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🔍</span>
            </div>
            <p className="text-sm font-medium text-foreground">{t('getLeads')}</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="p-6 pb-10 max-w-md mx-auto w-full animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <Button
          variant="hero"
          className="w-full"
          onClick={() => navigate('/auth')}
        >
          <span>{t('getStarted')}</span>
          <ArrowRight size={20} />
        </Button>
        
        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/auth')}
            className="text-primary font-semibold hover:underline"
          >
            {t('login')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Index;
