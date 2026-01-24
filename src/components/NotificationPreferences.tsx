import React, { useState, useEffect } from 'react';
import { Bell, Smartphone, Mail, MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationPreference {
  pushNotifications: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
  leadAvailable: boolean;
  leadClaimed: boolean;
  leadCompleted: boolean;
  ratings: boolean;
  subscriptionReminders: boolean;
  promotions: boolean;
}

const NotificationPreferences: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference>({
    pushNotifications: false,
    emailNotifications: true,
    smsNotifications: true,
    whatsappNotifications: true,
    leadAvailable: true,
    leadClaimed: true,
    leadCompleted: true,
    ratings: true,
    subscriptionReminders: true,
    promotions: false,
  });

  useEffect(() => {
    if (user) {
      fetchPreferences();
    }
  }, [user]);

  const fetchPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('notification_preferences')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.notification_preferences) {
        setPreferences(data.notification_preferences);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    }
  };

  const updatePreference = async (key: keyof NotificationPreference, value: boolean) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);

    try {
      setLoading(true);
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: user?.id,
            notification_preferences: updated,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      toast({
        title: 'Updated',
        description: 'Notification preferences saved',
      });
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save preferences',
      });
      // Revert change
      setPreferences(preferences);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Channel Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Channels
          </CardTitle>
          <CardDescription>Choose how you want to receive notifications</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationChannelOption
            icon={<Smartphone className="w-5 h-5" />}
            title="Push Notifications"
            description="Browser notifications on your device"
            enabled={preferences.pushNotifications}
            onChange={(value) => updatePreference('pushNotifications', value)}
            loading={loading}
          />
          <NotificationChannelOption
            icon={<Mail className="w-5 h-5" />}
            title="Email Notifications"
            description="Receive updates via email"
            enabled={preferences.emailNotifications}
            onChange={(value) => updatePreference('emailNotifications', value)}
            loading={loading}
          />
          <NotificationChannelOption
            icon={<MessageSquare className="w-5 h-5" />}
            title="SMS Notifications"
            description="Receive SMS alerts to your phone"
            enabled={preferences.smsNotifications}
            onChange={(value) => updatePreference('smsNotifications', value)}
            loading={loading}
          />
          <NotificationChannelOption
            icon={<MessageSquare className="w-5 h-5" />}
            title="WhatsApp Notifications"
            description="Receive alerts via WhatsApp"
            enabled={preferences.whatsappNotifications}
            onChange={(value) => updatePreference('whatsappNotifications', value)}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Event Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Event Notifications
          </CardTitle>
          <CardDescription>Choose which events you want to be notified about</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NotificationEventOption
            title="Lead Available"
            description="Get notified when new leads matching your profile are available"
            enabled={preferences.leadAvailable}
            onChange={(value) => updatePreference('leadAvailable', value)}
            loading={loading}
          />
          <NotificationEventOption
            title="Lead Claimed"
            description="Get notified when someone claims your lead"
            enabled={preferences.leadClaimed}
            onChange={(value) => updatePreference('leadClaimed', value)}
            loading={loading}
          />
          <NotificationEventOption
            title="Lead Completed"
            description="Get notified when a claimed lead is marked as completed"
            enabled={preferences.leadCompleted}
            onChange={(value) => updatePreference('leadCompleted', value)}
            loading={loading}
          />
          <NotificationEventOption
            title="Ratings"
            description="Get notified when you receive a new rating"
            enabled={preferences.ratings}
            onChange={(value) => updatePreference('ratings', value)}
            loading={loading}
          />
          <NotificationEventOption
            title="Subscription Reminders"
            description="Get notified when your subscription is expiring"
            enabled={preferences.subscriptionReminders}
            onChange={(value) => updatePreference('subscriptionReminders', value)}
            loading={loading}
          />
          <NotificationEventOption
            title="Promotions & Offers"
            description="Receive promotional offers and special deals"
            enabled={preferences.promotions}
            onChange={(value) => updatePreference('promotions', value)}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Notification Status */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Channels Active</p>
              <p className="text-lg font-bold">
                {Object.entries(preferences)
                  .filter(([key]) => ['pushNotifications', 'emailNotifications', 'smsNotifications', 'whatsappNotifications'].includes(key))
                  .filter(([, value]) => value)
                  .length}
                /4
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Events Enabled</p>
              <p className="text-lg font-bold">
                {Object.entries(preferences)
                  .filter(([key]) => ['leadAvailable', 'leadClaimed', 'leadCompleted', 'ratings', 'subscriptionReminders', 'promotions'].includes(key))
                  .filter(([, value]) => value)
                  .length}
                /6
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface NotificationChannelOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  loading: boolean;
}

const NotificationChannelOption: React.FC<NotificationChannelOptionProps> = ({
  icon,
  title,
  description,
  enabled,
  onChange,
  loading,
}) => (
  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
    <div className="flex items-center gap-3 flex-1">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
    <Switch checked={enabled} onCheckedChange={onChange} disabled={loading} />
  </div>
);

interface NotificationEventOptionProps {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  loading: boolean;
}

const NotificationEventOption: React.FC<NotificationEventOptionProps> = ({
  title,
  description,
  enabled,
  onChange,
  loading,
}) => (
  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
    <div className="flex-1">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <Switch checked={enabled} onCheckedChange={onChange} disabled={loading} />
  </div>
);

export default NotificationPreferences;
