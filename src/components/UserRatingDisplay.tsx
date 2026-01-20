import React from 'react';
import { Star } from 'lucide-react';

interface UserRatingDisplayProps {
  averageRating: number;
  totalRatings: number;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
}

const UserRatingDisplay: React.FC<UserRatingDisplayProps> = ({
  averageRating,
  totalRatings,
  size = 'md',
  showCount = true,
}) => {
  const starSize = size === 'sm' ? 12 : size === 'md' ? 16 : 20;
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';

  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(averageRating);
    const hasHalfStar = averageRating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star
            key={i}
            size={starSize}
            className="text-secondary fill-secondary"
          />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <Star size={starSize} className="text-muted-foreground" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star size={starSize} className="text-secondary fill-secondary" />
            </div>
          </div>
        );
      } else {
        stars.push(
          <Star
            key={i}
            size={starSize}
            className="text-muted-foreground"
          />
        );
      }
    }
    return stars;
  };

  if (totalRatings === 0) {
    return (
      <div className={`flex items-center gap-1 ${textSize} text-muted-foreground`}>
        <Star size={starSize} className="text-muted-foreground" />
        <span>No ratings yet</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${textSize}`}>
      <div className="flex items-center gap-0.5">{renderStars()}</div>
      <span className="font-medium text-foreground">{averageRating.toFixed(1)}</span>
      {showCount && (
        <span className="text-muted-foreground">
          ({totalRatings} {totalRatings === 1 ? 'review' : 'reviews'})
        </span>
      )}
    </div>
  );
};

export default UserRatingDisplay;
