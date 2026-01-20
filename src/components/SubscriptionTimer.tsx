import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubscriptionTimerProps {
  expiresAt: string | null;
  isSubscribed: boolean;
  compact?: boolean;
}

const SubscriptionTimer: React.FC<SubscriptionTimerProps> = ({ 
  expiresAt, 
  isSubscribed,
  compact = false 
}) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    expired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, expired: false });

  useEffect(() => {
    if (!expiresAt || !isSubscribed) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, expired: true });
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, expired: true });
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      setTimeLeft({ days, hours, minutes, expired: false });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [expiresAt, isSubscribed]);

  if (!isSubscribed) {
    return (
      <div className={cn(
        "flex items-center gap-2 text-muted-foreground",
        compact ? "text-xs" : "text-sm"
      )}>
        <AlertTriangle size={compact ? 14 : 16} className="text-secondary" />
        <span>No active subscription</span>
      </div>
    );
  }

  if (timeLeft.expired) {
    return (
      <div className={cn(
        "flex items-center gap-2 text-destructive",
        compact ? "text-xs" : "text-sm"
      )}>
        <AlertTriangle size={compact ? 14 : 16} />
        <span>Subscription expired</span>
      </div>
    );
  }

  const isLow = timeLeft.days <= 5;
  const isVeryLow = timeLeft.days <= 2;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-1.5 font-medium",
        isVeryLow ? "text-destructive" : isLow ? "text-secondary" : "text-primary"
      )}>
        <Clock size={14} />
        <span>{timeLeft.days}d {timeLeft.hours}h left</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "rounded-xl p-4 border",
      isVeryLow 
        ? "bg-destructive/10 border-destructive/30" 
        : isLow 
        ? "bg-secondary/10 border-secondary/30" 
        : "bg-primary/10 border-primary/30"
    )}>
      <div className="flex items-center gap-2 mb-3">
        {isVeryLow ? (
          <AlertTriangle className="text-destructive" size={20} />
        ) : (
          <CheckCircle className={isLow ? "text-secondary" : "text-primary"} size={20} />
        )}
        <span className={cn(
          "font-semibold",
          isVeryLow ? "text-destructive" : isLow ? "text-secondary" : "text-primary"
        )}>
          {isVeryLow ? "Expiring Soon!" : isLow ? "Renew Soon" : "Premium Active"}
        </span>
      </div>

      <div className="flex gap-3 justify-center">
        <div className="text-center">
          <div className={cn(
            "text-2xl font-bold",
            isVeryLow ? "text-destructive" : isLow ? "text-secondary" : "text-primary"
          )}>
            {timeLeft.days}
          </div>
          <div className="text-xs text-muted-foreground">Days</div>
        </div>
        <div className="text-center">
          <div className={cn(
            "text-2xl font-bold",
            isVeryLow ? "text-destructive" : isLow ? "text-secondary" : "text-primary"
          )}>
            {timeLeft.hours}
          </div>
          <div className="text-xs text-muted-foreground">Hours</div>
        </div>
        <div className="text-center">
          <div className={cn(
            "text-2xl font-bold",
            isVeryLow ? "text-destructive" : isLow ? "text-secondary" : "text-primary"
          )}>
            {timeLeft.minutes}
          </div>
          <div className="text-xs text-muted-foreground">Mins</div>
        </div>
      </div>

      {expiresAt && (
        <div className="text-xs text-center text-muted-foreground mt-3">
          Expires: {new Date(expiresAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      )}
    </div>
  );
};

export default SubscriptionTimer;
