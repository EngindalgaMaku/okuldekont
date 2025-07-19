const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixOgretmenlerPolicies() {
  console.log('Fixing ogretmenler RLS policies...');
  
  // Drop existing policies
  const dropPolicies = [
    'DROP POLICY IF EXISTS "Allow all for authenticated users" ON ogretmenler;',
    'DROP POLICY IF EXISTS "Allow anonymous read access to ogretmenler" ON ogretmenler;',
    'DROP POLICY IF EXISTS "Authenticated users can read all" ON ogretmenler;',
    'DROP POLICY IF EXISTS "Öğretmenler herkes tarafından görüntülenebilir" ON ogretmenler;'
  ];
  
  for (const query of dropPolicies) {
    console.log('Executing:', query);
    const { error } = await supabase.rpc('exec_sql', { query });
    if (error) console.error('Error dropping policy:', error);
    else console.log('Policy dropped successfully');
  }
  
  // Create new policies
  const createPolicies = [
    'CREATE POLICY "Admin users can do everything on ogretmenler" ON ogretmenler FOR ALL TO authenticated USING (true) WITH CHECK (true);',
    'CREATE POLICY "Allow public read access to ogretmenler" ON ogretmenler FOR SELECT TO anon USING (true);'
  ];
  
  for (const query of createPolicies) {
    console.log('Executing:', query);
    const { error } = await supabase.rpc('exec_sql', { query });
    if (error) console.error('Error creating policy:', error);
    else console.log('Policy created successfully');
  }
  
  console.log('RLS policies fixed!');
}

fixOgretmenlerPolicies().catch(console.error);