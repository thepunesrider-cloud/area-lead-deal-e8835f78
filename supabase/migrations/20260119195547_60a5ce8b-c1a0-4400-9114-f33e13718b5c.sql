-- Add source tracking columns to leads table for WhatsApp import
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual' CHECK (source IN ('manual', 'whatsapp', 'api')),
ADD COLUMN IF NOT EXISTS whatsapp_message_id text UNIQUE,
ADD COLUMN IF NOT EXISTS import_confidence integer CHECK (import_confidence >= 0 AND import_confidence <= 100),
ADD COLUMN IF NOT EXISTS raw_message text;

-- Create index for faster duplicate checking
CREATE INDEX IF NOT EXISTS idx_leads_whatsapp_message_id ON public.leads(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;

-- Create index for source-based queries
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);

-- Allow service role to insert leads (for webhook)
CREATE POLICY "Service role can insert leads" 
ON public.leads 
FOR INSERT 
TO service_role
WITH CHECK (true);