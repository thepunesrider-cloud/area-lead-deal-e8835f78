import React, { useState, useEffect } from 'react';
import { User, MapPin, Phone, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import UserRatingDisplay from './UserRatingDisplay';
import { openWhatsApp } from '@/lib/whatsapp';

interface UserProfile {
  id: string;
  name: string;
  phone: string | null;
  avatar_url: string | null;
  service_type: string | null;
  service_radius_km: number | null;
  location_lat: number | null;
  location_long: number | null;
}

interface Rating {
  rating: number;
  comment: string | null;
  created_at: string;
}

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  open,
  onOpenChange,
  userId,
}) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && userId) {
      fetchUserData();
    }
  }, [open, userId]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, phone, avatar_url, service_type, service_radius_km, location_lat, location_long')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('ratings')
        .select('rating, comment, created_at')
        .eq('rated_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (ratingsError) throw ratingsError;
      setRatings(ratingsData || []);

      // Calculate average rating
      if (ratingsData && ratingsData.length > 0) {
        const avg = ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length;
        setAverageRating(avg);
      } else {
        setAverageRating(0);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatServiceType = (type: string | null) => {
    if (!type) return 'General Services';
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 rounded-2xl">
        <DialogHeader>
          <DialogTitle>Service Provider Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : profile ? (
          <div className="py-4 space-y-6">
            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User size={32} className="text-primary" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">{profile.name || 'Unknown'}</h3>
                <p className="text-sm text-muted-foreground">{formatServiceType(profile.service_type)}</p>
                <div className="mt-1">
                  <UserRatingDisplay
                    averageRating={averageRating}
                    totalRatings={ratings.length}
                    size="sm"
                  />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-primary">{ratings.length}</div>
                <div className="text-xs text-muted-foreground">Completed Jobs</div>
              </div>
              <div className="bg-muted/50 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-secondary">
                  {averageRating > 0 ? averageRating.toFixed(1) : '-'}
                </div>
                <div className="text-xs text-muted-foreground">Avg Rating</div>
              </div>
            </div>

            {/* Service Radius */}
            {profile.service_radius_km && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin size={16} />
                <span>Serves within {profile.service_radius_km} km radius</span>
              </div>
            )}

            {/* Recent Reviews */}
            {ratings.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-foreground">Recent Reviews</h4>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {ratings.slice(0, 5).map((rating, index) => (
                    <div key={index} className="bg-muted/30 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={star <= rating.rating ? 'text-secondary fill-secondary' : 'text-muted-foreground'}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(rating.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {rating.comment && (
                        <p className="text-sm text-foreground">{rating.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Button */}
            {profile.phone && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => openWhatsApp(profile.phone!, 'Hello, I saw your profile on LEADX.')}
              >
                <Phone size={18} />
                Contact via WhatsApp
              </Button>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Profile not found
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;
