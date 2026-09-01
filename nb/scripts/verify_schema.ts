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

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifySchema() {
  console.log('🔍 Verifying Database Schema...\n');
  console.log('Connected to:', supabaseUrl);
  console.log('');

  // Try to query projects table to see what columns exist
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error querying projects:', error.message);
    return;
  }

  if (projects && projects.length > 0) {
    const project = projects[0];
    console.log('📊 Available columns in projects table:');
    console.log('');
    
    const columns = Object.keys(project).sort();
    const requiredColumns = ['problem_statement', 'solution_overview', 'short_description', 'github_repository', 'live_demo_url'];
    
    columns.forEach(col => {
      const isRequired = requiredColumns.includes(col);
      const marker = isRequired ? '🎯' : '  ';
      console.log(`${marker} ${col}`);
    });

    console.log('\n--- Missing Required Columns ---');
    const missingColumns = requiredColumns.filter(col => !columns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('✅ All required columns exist!');
    } else {
      console.log('❌ Missing columns:');
      missingColumns.forEach(col => {
        console.log(`   - ${col}`);
      });
      console.log('\n💡 You need to run this SQL:');
      console.log('ALTER TABLE public.projects');
      missingColumns.forEach((col, idx) => {
        const comma = idx < missingColumns.length - 1 ? ',' : ';';
        console.log(`ADD COLUMN IF NOT EXISTS ${col} TEXT${comma}`);
      });
    }
  } else {
    console.log('⚠️  No projects found to verify schema');
  }
}

verifySchema().then(() => process.exit(0));
