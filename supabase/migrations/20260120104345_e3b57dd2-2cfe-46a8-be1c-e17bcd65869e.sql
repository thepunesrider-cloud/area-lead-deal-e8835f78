-- Add columns for enhanced WhatsApp lead tracking
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_generator_name TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_group_id TEXT;

-- Add index for group-based queries
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_group_id ON public.leads(whatsapp_group_id) WHERE whatsapp_group_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.leads.lead_generator_name IS 'WhatsApp profile name of the person who sent the lead';
COMMENT ON COLUMN public.leads.whatsapp_group_id IS 'WhatsApp group ID if lead came from a group';