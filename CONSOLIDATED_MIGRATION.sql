-- CONSOLIDATED MIGRATION - All schema changes for LeadX/Area Lead Deal
-- Run this entire file at once in Supabase SQL Editor

-- ============================================================================
-- PART 1: INITIAL SETUP - Enums and Base Tables
-- ============================================================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads CASCADE;
DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.auto_reject_expired_leads() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(_user_id uuid, _role app_role) CASCADE;

-- Drop existing tables
DROP TABLE IF EXISTS public.leads CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.lead_messages CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.community_messages CASCADE;
DROP TABLE IF EXISTS public.push_tokens CASCADE;
DROP TABLE IF EXISTS public.whatsapp_messages CASCADE;
DROP TABLE IF EXISTS public.ratings CASCADE;
DROP TABLE IF EXISTS public.app_settings CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS public.lead_status CASCADE;
DROP TYPE IF EXISTS public.service_type CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Create enum for service types
CREATE TYPE public.service_type AS ENUM ('rent_agreement', 'domicile', 'income_certificate', 'birth_certificate', 'death_certificate', 'other');

-- Create enum for lead status
CREATE TYPE public.lead_status AS ENUM ('open', 'claimed', 'completed', 'cancelled', 'rejected', 'pending');

-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- ============================================================================
-- PART 1B: CORE FUNCTIONS (must be defined before tables that use them)
-- ============================================================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 2: PROFILES TABLE
-- ============================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en',
  location_lat DOUBLE PRECISION,
  location_long DOUBLE PRECISION,
  service_radius_km INTEGER DEFAULT 10,
  service_type service_type DEFAULT 'rent_agreement',
  is_subscribed BOOLEAN DEFAULT FALSE,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- PART 3: LEADS TABLE
-- ============================================================================

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  service_type service_type NOT NULL DEFAULT 'rent_agreement',
  location_lat DOUBLE PRECISION NOT NULL,
  location_long DOUBLE PRECISION NOT NULL,
  location_address TEXT,
  customer_name TEXT,
  customer_phone TEXT NOT NULL,
  lead_generator_phone TEXT,
  lead_generator_name TEXT,
  photo_url TEXT,
  proof_url TEXT,
  notes TEXT,
  special_instructions TEXT,
  raw_message TEXT,
  source TEXT,
  status lead_status DEFAULT 'open',
  claimed_by_user_id UUID REFERENCES public.profiles(id),
  claimed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  lead_code TEXT,
  import_confidence INTEGER,
  whatsapp_group_id TEXT,
  whatsapp_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Leads policies
CREATE POLICY "Authenticated users can view open leads" ON public.leads
  FOR SELECT TO authenticated USING (status = 'open' OR created_by_user_id = auth.uid() OR claimed_by_user_id = auth.uid());

CREATE POLICY "Users can create leads" ON public.leads
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Users can update their own leads" ON public.leads
  FOR UPDATE TO authenticated USING (created_by_user_id = auth.uid() OR claimed_by_user_id = auth.uid())
  WITH CHECK (created_by_user_id = auth.uid() OR claimed_by_user_id = auth.uid());

CREATE POLICY "Users can claim open leads" ON public.leads
  FOR UPDATE TO authenticated USING (status = 'open')
  WITH CHECK (status = 'open' OR claimed_by_user_id = auth.uid());

-- ============================================================================
-- PART 4: USER ROLES TABLE
-- ============================================================================

CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Function to check if user has a specific role (must be created after user_roles table)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ============================================================================
-- PART 4B: ADMIN POLICIES (require has_role function to exist first)
-- ============================================================================

-- Admin policies for leads
CREATE POLICY "Admins can delete leads"
ON public.leads FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all leads"
ON public.leads FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all leads"
ON public.leads FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin policies for user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Admin policies for profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- PART 5: LEAD MESSAGES TABLE
-- ============================================================================

CREATE TABLE public.lead_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lead participants can view messages"
ON public.lead_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
    AND (l.created_by_user_id = auth.uid() OR l.claimed_by_user_id = auth.uid())
  )
);

CREATE POLICY "Lead participants can send messages"
ON public.lead_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_id
    AND (l.created_by_user_id = auth.uid() OR l.claimed_by_user_id = auth.uid())
  )
);

-- ============================================================================
-- PART 6: NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- PART 7: PAYMENTS TABLE
-- ============================================================================

CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'pending',
  payment_gateway text NOT NULL DEFAULT 'razorpay',
  gateway_order_id text,
  gateway_transaction_id text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own payments"
ON public.payments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own payments"
ON public.payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all payments"
ON public.payments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all payments"
ON public.payments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- PART 8: COMMUNITY MESSAGES TABLE
-- ============================================================================

CREATE TABLE public.community_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view community messages"
ON public.community_messages
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can post community messages"
ON public.community_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PART 9: PUSH TOKENS TABLE
-- ============================================================================

CREATE TABLE public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  token text NOT NULL,
  device_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own push tokens"
ON public.push_tokens
FOR ALL
USING (auth.uid() = user_id);

-- ============================================================================
-- PART 10: RATINGS TABLE
-- ============================================================================

CREATE TABLE public.ratings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL,
  rated_user_id uuid NOT NULL,
  rating integer NOT NULL,
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings"
ON public.ratings
FOR SELECT
USING (true);

CREATE POLICY "Users can create ratings"
ON public.ratings
FOR INSERT
WITH CHECK (auth.uid() = rater_id);

-- ============================================================================
-- PART 11: WHATSAPP MESSAGES TABLE
-- ============================================================================

CREATE TABLE public.whatsapp_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id text,
  group_name text,
  sender_phone text,
  sender_name text,
  message_timestamp timestamp with time zone,
  raw_message text,
  status text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all whatsapp messages"
ON public.whatsapp_messages
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- PART 12: APP SETTINGS TABLE
-- ============================================================================

CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read settings"
ON public.app_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage settings"
ON public.app_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================================
-- PART 13: ADDITIONAL FUNCTIONS
-- ============================================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'phone', NEW.phone)
  );
  RETURN NEW;
END;
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function to automatically reject leads claimed for more than 3 days
CREATE OR REPLACE FUNCTION public.auto_reject_expired_leads()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.leads
  SET 
    status = 'rejected',
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

-- ============================================================================
-- PART 14: TRIGGERS
-- ============================================================================

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- PART 15: REALTIME & INDEXES
-- ============================================================================

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_claimed_status 
ON public.leads(claimed_at, status) 
WHERE status = 'claimed';

CREATE INDEX IF NOT EXISTS idx_leads_location
ON public.leads(location_lat, location_long);

CREATE INDEX IF NOT EXISTS idx_profiles_location
ON public.profiles(location_lat, location_long);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
ON public.notifications(user_id, read);

CREATE INDEX IF NOT EXISTS idx_lead_messages_lead_id
ON public.lead_messages(lead_id);

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
