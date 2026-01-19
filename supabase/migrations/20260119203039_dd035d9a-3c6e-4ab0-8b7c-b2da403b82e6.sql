-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can update their own leads" ON leads;

-- Create a more permissive policy that allows:
-- 1. Lead creators to update their own leads (any status)
-- 2. Users who claimed a lead to update it
-- 3. ANY authenticated user to claim an OPEN lead
CREATE POLICY "Users can update leads appropriately" ON leads
FOR UPDATE
USING (
  (created_by_user_id = auth.uid()) OR 
  (claimed_by_user_id = auth.uid()) OR
  (status = 'open' AND claimed_by_user_id IS NULL)
)
WITH CHECK (
  (created_by_user_id = auth.uid()) OR 
  (claimed_by_user_id = auth.uid()) OR
  (status = 'claimed' AND claimed_by_user_id = auth.uid())
);