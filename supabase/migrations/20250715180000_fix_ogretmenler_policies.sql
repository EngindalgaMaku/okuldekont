-- Fix ogretmenler RLS policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON ogretmenler;
DROP POLICY IF EXISTS "Allow anonymous read access to ogretmenler" ON ogretmenler;
DROP POLICY IF EXISTS "Authenticated users can read all" ON ogretmenler;
DROP POLICY IF EXISTS "Öğretmenler herkes tarafından görüntülenebilir" ON ogretmenler;

-- Create new clean policies for ogretmenler
CREATE POLICY "Admin users can do everything on ogretmenler"
ON ogretmenler
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public read access to ogretmenler"
ON ogretmenler
FOR SELECT
TO anon
USING (true);