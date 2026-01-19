-- Add 'pending' status to lead_status enum
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'pending';

-- Create app settings table for storing configuration like auto-approve
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view and modify settings
CREATE POLICY "Admins can view settings"
ON public.app_settings FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings"
ON public.app_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings"
ON public.app_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Service role can read settings (for edge functions)
CREATE POLICY "Service role can read settings"
ON public.app_settings FOR SELECT
TO service_role
USING (true);

-- Insert default setting for whatsapp auto-approve (disabled by default)
INSERT INTO public.app_settings (key, value)
VALUES ('whatsapp_auto_approve', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
BEFORE UPDATE ON public.app_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();