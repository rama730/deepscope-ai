
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = envContent.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {} as Record<string, string>);

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']; 
// Note: Anon key might not have permission to run exec_sql depending on setup, 
// but often in these dev environments it might, or I should check if SERVICE_ROLE_KEY is in env.
const serviceKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Prefer service key for admin tasks if available
const supabase = createClient(supabaseUrl, serviceKey || supabaseKey);

async function applyMigration() {
  console.log('🔍 Checking if exec_sql RPC is available...');
  
  const testQuery = "SELECT count(*) FROM information_schema.tables WHERE table_name = 'project_files'";
  const { data: rpcData, error: rpcError } = await supabase.rpc('exec_sql', { query: testQuery });

  if (rpcError) {
      console.error('❌ exec_sql failed:', rpcError);
      console.log('Cannot apply migration automatically via RPC.');
      console.log('Please run the migration manually using your database tool or Supabase CLI.');
      console.log('Migration file: supabase/migrations/0050_fix_files_schema_and_rls.sql');
  } else {
      console.log('✅ exec_sql available. Result:', rpcData);
      
      const migrationPath = path.resolve(process.cwd(), 'supabase/migrations/0050_fix_files_schema_and_rls.sql');
      if (fs.existsSync(migrationPath)) {
          const sql = fs.readFileSync(migrationPath, 'utf-8');
          console.log('🚀 Applying migration 0050...');
          
          const { error: migrationError } = await supabase.rpc('exec_sql', { query: sql });
          
          if (migrationError) {
              console.error('❌ Migration application failed:', migrationError);
          } else {
              console.log('✅ Migration applied successfully via RPC!');
          }
      } else {
          console.error('❌ Migration file not found at:', migrationPath);
      }
  }
}

applyMigration().then(() => process.exit(0));
