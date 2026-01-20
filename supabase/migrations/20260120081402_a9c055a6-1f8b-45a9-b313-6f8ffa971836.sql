-- Step 1: Add lead_code column first
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lead_code TEXT UNIQUE;

-- Step 2: Create function to generate structured lead codes
CREATE OR REPLACE FUNCTION public.generate_lead_code()
RETURNS TRIGGER AS $$
DECLARE
  service_code TEXT;
  location_code TEXT;
  sequence_num INTEGER;
  new_code TEXT;
BEGIN
  -- Service type codes
  service_code := CASE NEW.service_type
    WHEN 'rent_agreement' THEN 'RA'
    WHEN 'domicile' THEN 'DM'
    WHEN 'income_certificate' THEN 'IC'
    WHEN 'birth_certificate' THEN 'BC'
    WHEN 'death_certificate' THEN 'DC'
    WHEN 'other' THEN 'OT'
    ELSE 'OT'
  END;
  
  -- Location code from address
  IF NEW.location_address IS NOT NULL AND LENGTH(NEW.location_address) >= 3 THEN
    location_code := UPPER(SUBSTRING(REGEXP_REPLACE(NEW.location_address, '[^a-zA-Z]', '', 'g') FROM 1 FOR 3));
  ELSE
    location_code := 'LOC';
  END IF;
  
  IF LENGTH(location_code) < 3 THEN
    location_code := location_code || REPEAT('X', 3 - LENGTH(location_code));
  END IF;
  
  -- Get next sequence number
  SELECT COALESCE(MAX(CAST(NULLIF(SUBSTRING(lead_code FROM '[0-9]+$'), '') AS INTEGER)), 0) + 1 
  INTO sequence_num
  FROM leads
  WHERE lead_code LIKE service_code || '-%';
  
  NEW.lead_code := service_code || '-' || location_code || '-' || LPAD(sequence_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;