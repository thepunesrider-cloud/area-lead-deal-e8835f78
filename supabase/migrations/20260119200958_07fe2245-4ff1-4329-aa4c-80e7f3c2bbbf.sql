-- Add the profile for the admin user that was created via admin API
-- First, we need to add a policy that allows service role to insert profiles
CREATE POLICY "Service role can insert profiles"
ON public.profiles
FOR INSERT
TO service_role
WITH CHECK (true);

-- Insert the admin profile
INSERT INTO public.profiles (id, name, phone)
VALUES ('981425f1-63b2-4432-b116-0709b0f5afd8', 'Admin', NULL)
ON CONFLICT (id) DO NOTHING;