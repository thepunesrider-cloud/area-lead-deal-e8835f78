-- Create whatsapp_messages table for storing raw messages from the bot
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_name TEXT,
  sender_phone TEXT,
  raw_message TEXT,
  group_name TEXT,
  group_id TEXT,
  message_timestamp TIMESTAMPTZ,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert (for edge function)
CREATE POLICY "Service role can insert messages"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (true);

-- Allow admins to view all messages
CREATE POLICY "Admins can view all messages"
ON public.whatsapp_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update messages
CREATE POLICY "Admins can update messages"
ON public.whatsapp_messages
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete messages
CREATE POLICY "Admins can delete messages"
ON public.whatsapp_messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));