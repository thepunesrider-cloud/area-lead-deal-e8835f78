-- Step 3: Create trigger for auto-generating lead codes on new inserts
DROP TRIGGER IF EXISTS generate_lead_code_trigger ON public.leads;
CREATE TRIGGER generate_lead_code_trigger
BEFORE INSERT ON public.leads
FOR EACH ROW
WHEN (NEW.lead_code IS NULL)
EXECUTE FUNCTION public.generate_lead_code();

-- Step 4: Generate lead codes for existing leads that don't have one
DO $$
DECLARE
  lead_row RECORD;
  service_code TEXT;
  location_code TEXT;
  sequence_num INTEGER := 0;
  last_service TEXT := '';
BEGIN
  FOR lead_row IN 
    SELECT id, service_type, location_address 
    FROM leads 
    WHERE lead_code IS NULL 
    ORDER BY service_type, created_at
  LOOP
    service_code := CASE lead_row.service_type::text
      WHEN 'rent_agreement' THEN 'RA'
      WHEN 'domicile' THEN 'DM'
      WHEN 'income_certificate' THEN 'IC'
      WHEN 'birth_certificate' THEN 'BC'
      WHEN 'death_certificate' THEN 'DC'
      WHEN 'other' THEN 'OT'
      ELSE 'OT'
    END;
    
    IF service_code != last_service THEN
      sequence_num := 0;
      last_service := service_code;
    END IF;
    sequence_num := sequence_num + 1;
    
    IF lead_row.location_address IS NOT NULL AND LENGTH(lead_row.location_address) >= 3 THEN
      location_code := UPPER(SUBSTRING(REGEXP_REPLACE(lead_row.location_address, '[^a-zA-Z]', '', 'g') FROM 1 FOR 3));
    ELSE
      location_code := 'LOC';
    END IF;
    
    IF LENGTH(location_code) < 3 THEN
      location_code := location_code || REPEAT('X', 3 - LENGTH(location_code));
    END IF;
    
    UPDATE leads 
    SET lead_code = service_code || '-' || location_code || '-' || LPAD(sequence_num::TEXT, 4, '0')
    WHERE id = lead_row.id;
  END LOOP;
END $$;

-- Step 5: Create ratings table (if not exists from previous partial migration)
CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL,
  rated_user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ratings_rated_user ON public.ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_lead ON public.ratings(lead_id);

-- Enable RLS on ratings
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any and recreate
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.ratings;
CREATE POLICY "Anyone can view ratings" ON public.ratings
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lead generators can create ratings" ON public.ratings;
CREATE POLICY "Lead generators can create ratings" ON public.ratings
FOR INSERT WITH CHECK (
  auth.uid() = rater_id AND
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_id 
    AND leads.created_by_user_id = auth.uid()
    AND leads.status = 'completed'
  )
);