-- Drop the existing source check constraint and add msg91 as a valid source
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_source_check;

-- Create new check constraint that includes all WhatsApp sources
ALTER TABLE public.leads ADD CONSTRAINT leads_source_check 
CHECK (source IS NULL OR source IN ('manual', 'whatsapp', 'whatsapp_group', 'whatsapp_forwarded', 'msg91'));