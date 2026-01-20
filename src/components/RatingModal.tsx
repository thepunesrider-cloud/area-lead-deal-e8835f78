import React, { useState } from 'react';
import { Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RatingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  ratedUserId: string;
  ratedUserName?: string;
  onRatingSubmitted?: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({
  open,
  onOpenChange,
  leadId,
  ratedUserId,
  ratedUserName = 'the service provider',
  onRatingSubmitted,
}) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        variant: 'destructive',
        title: 'Rating required',
        description: 'Please select a star rating',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('ratings').insert({
        lead_id: leadId,
        rater_id: user.id,
        rated_user_id: ratedUserId,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      toast({
        title: 'Rating submitted',
        description: 'Thank you for your feedback!',
      });

      onOpenChange(false);
      onRatingSubmitted?.();
      
      // Reset state
      setRating(0);
      setComment('');
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to submit rating. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-4 rounded-2xl">
        <DialogHeader>
          <DialogTitle>Rate {ratedUserName}</DialogTitle>
          <DialogDescription>
            How was your experience with this service provider?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Star Rating */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="focus:outline-none transition-transform hover:scale-110"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                >
                  <Star
                    size={32}
                    className={`transition-colors ${
                      star <= displayRating
                        ? 'text-secondary fill-secondary'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {displayRating === 0
                ? 'Tap to rate'
                : displayRating === 1
                ? 'Poor'
                : displayRating === 2
                ? 'Fair'
                : displayRating === 3
                ? 'Good'
                : displayRating === 4
                ? 'Very Good'
                : 'Excellent'}
            </span>
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Add a comment (optional)
            </label>
            <Textarea
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              variant="hero"
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
            >
              {submitting ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                'Submit Rating'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RatingModal;
