-- Add auto-rejection feature for leads not completed within 3 days

-- Function to automatically reject leads claimed for more than 3 days without completion
CREATE OR REPLACE FUNCTION auto_reject_expired_leads()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update leads that have been claimed for more than 3 days and are still in 'claimed' status
  UPDATE public.leads
  SET 
    status = 'open',
    claimed_by_user_id = NULL,
    claimed_at = NULL,
    rejected_at = NOW()
  WHERE 
    status = 'claimed'
    AND claimed_at IS NOT NULL
    AND claimed_at < NOW() - INTERVAL '3 days'
    AND completed_at IS NULL;
END;
$$;

-- Create a function to be called via cron or scheduled job
-- This can be triggered by an edge function or external cron service
COMMENT ON FUNCTION auto_reject_expired_leads() IS 'Automatically rejects leads that have been claimed for more than 3 days without completion';

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_claimed_status 
ON public.leads(claimed_at, status) 
WHERE status = 'claimed';
