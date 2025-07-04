-- Allow anonymous users to read data required for the login page.
-- This is necessary so that users can select their business/teacher before logging in.

-- Create new policies for anonymous read access
CREATE POLICY "Allow anonymous read access to isletmeler"
  ON public.isletmeler FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous read access to ogretmenler"
  ON public.ogretmenler FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anonymous read access to egitim_yillari"
  ON public.egitim_yillari FOR SELECT
  TO anon
  USING (true); 