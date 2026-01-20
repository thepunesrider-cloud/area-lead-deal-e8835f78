-- Create storage bucket for lead proof uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('lead-proofs', 'lead-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own proof files
CREATE POLICY "Users can upload proof files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'lead-proofs' 
  AND auth.uid() IS NOT NULL
);

-- Allow anyone to view proof files (for admins and lead creators)
CREATE POLICY "Proof files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'lead-proofs');

-- Allow users to update their own proof files
CREATE POLICY "Users can update their proof files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'lead-proofs' AND auth.uid() IS NOT NULL);

-- Allow users to delete their own proof files
CREATE POLICY "Users can delete their proof files"
ON storage.objects FOR DELETE
USING (bucket_id = 'lead-proofs' AND auth.uid() IS NOT NULL);