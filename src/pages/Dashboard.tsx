import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Search, Star, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

const Dashboard: React.FC = () => {
  const { user, profile, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        rightElement={
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative"
            onClick={() => navigate('/notifications')}
          >
            <Bell size={20} />
            <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full" />
          </Button>
        }
      />

      <main className="px-4 py-6 max-w-md mx-auto">
        {/* Welcome Section */}
        <div className="mb-8 animate-slide-up">
          <p className="text-muted-foreground text-sm">{greeting()}</p>
          <h1 className="text-2xl font-bold text-foreground mt-1">
            {profile?.name || 'Agent'}
          </h1>
          
          {/* Subscription Badge */}
          <div className={`inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-full text-sm font-medium ${
            profile?.is_subscribed 
              ? 'bg-primary/10 text-primary' 
              : 'bg-secondary/10 text-secondary'
          }`}>
            <Star size={16} className={profile?.is_subscribed ? 'fill-primary' : ''} />
            <span>{profile?.is_subscribed ? t('premiumPlan') : t('freePlan')}</span>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="space-y-4">
          {/* Generate Lead Button */}
          <button
            onClick={() => navigate('/generate-lead')}
            className="w-full group animate-fade-in"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="bg-primary text-primary-foreground rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02] group-active:scale-[0.98]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary-foreground/20 rounded-2xl flex items-center justify-center">
                  <PlusCircle size={32} />
                </div>
                <div className="text-left flex-1">
                  <h2 className="text-xl font-bold">{t('generateLead')}</h2>
                  <p className="text-primary-foreground/80 text-sm mt-1">
                    {t('postJob')}
                  </p>
                </div>
              </div>
            </div>
          </button>

          {/* Get Leads Button */}
          <button
            onClick={() => navigate('/get-leads')}
            className="w-full group animate-fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="bg-secondary text-secondary-foreground rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02] group-active:scale-[0.98]">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-secondary-foreground/20 rounded-2xl flex items-center justify-center">
                  <Search size={32} />
                </div>
                <div className="text-left flex-1">
                  <h2 className="text-xl font-bold">{t('getLeads')}</h2>
                  <p className="text-secondary-foreground/80 text-sm mt-1">
                    {t('findWork')}
                  </p>
                </div>
              </div>
            </div>
          </button>
        </div>

        {/* Quick Stats */}
        {!profile?.is_subscribed && (
          <div className="mt-8 bg-card rounded-2xl border border-border p-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center">
                <Star className="text-secondary" size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{t('unlockLeads')}</p>
                <p className="text-xs text-muted-foreground">₹500{t('perMonth')}</p>
              </div>
              <Button 
                variant="actionSecondary" 
                size="sm"
                onClick={() => navigate('/subscribe')}
              >
                {t('subscribeNow')}
              </Button>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Dashboard;
