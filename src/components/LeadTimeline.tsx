import React from 'react';
import { Check, Clock, FileText, XCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  status: string;
  timestamp: string | null;
  label: string;
  icon: React.ReactNode;
  completed: boolean;
  current: boolean;
}

interface LeadTimelineProps {
  lead: {
    status: string;
    created_at: string;
    claimed_at: string | null;
    completed_at: string | null;
    rejected_at: string | null;
  };
  showDetails?: boolean;
}

const LeadTimeline: React.FC<LeadTimelineProps> = ({ lead, showDetails = false }) => {
  const getTimelineEvents = (): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    
    // Created/Generated
    events.push({
      status: 'created',
      timestamp: lead.created_at,
      label: 'Lead Generated',
      icon: <FileText size={16} />,
      completed: true,
      current: lead.status === 'open' || lead.status === 'pending',
    });

    // Claimed/Accepted
    const isClaimed = !!lead.claimed_at;
    events.push({
      status: 'claimed',
      timestamp: lead.claimed_at,
      label: 'Lead Accepted',
      icon: <User size={16} />,
      completed: isClaimed,
      current: lead.status === 'claimed',
    });

    // Final status - either completed or rejected
    if (lead.status === 'completed') {
      events.push({
        status: 'completed',
        timestamp: lead.completed_at,
        label: 'Completed',
        icon: <Check size={16} />,
        completed: true,
        current: true,
      });
    } else if (lead.status === 'rejected') {
      events.push({
        status: 'rejected',
        timestamp: lead.rejected_at,
        label: 'Rejected',
        icon: <XCircle size={16} />,
        completed: true,
        current: true,
      });
    } else {
      // Show pending completion step
      events.push({
        status: 'pending_completion',
        timestamp: null,
        label: 'Awaiting Completion',
        icon: <Clock size={16} />,
        completed: false,
        current: false,
      });
    }

    return events;
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const events = getTimelineEvents();

  return (
    <div className="relative">
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const isRejected = event.status === 'rejected';

        return (
          <div key={event.status} className="flex items-start gap-3 pb-4 last:pb-0">
            {/* Timeline connector */}
            <div className="relative flex flex-col items-center">
              {/* Icon circle */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all',
                  event.completed
                    ? isRejected
                      ? 'bg-destructive/10 border-destructive text-destructive'
                      : 'bg-primary/10 border-primary text-primary'
                    : 'bg-muted border-border text-muted-foreground',
                  event.current && !isRejected && 'ring-4 ring-primary/20'
                )}
              >
                {event.icon}
              </div>
              
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-[24px]',
                    event.completed ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <p
                className={cn(
                  'font-medium text-sm',
                  event.completed ? 'text-foreground' : 'text-muted-foreground',
                  isRejected && 'text-destructive'
                )}
              >
                {event.label}
              </p>
              {showDetails && event.timestamp && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatTimestamp(event.timestamp)}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LeadTimeline;
