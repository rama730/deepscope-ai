
import { createClient } from "@supabase/supabase-js";
import path from "path";
import fs from "fs";

// Load environment variables from .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
let envConfig: Record<string, string> = {};

try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            envConfig[key.trim()] = value.trim().replace(/"/g, '');
        }
    });
} catch (e) {
    console.error("Could not read .env.local");
}

const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRolesSchema() {
  console.log('🔍 Checking project_open_roles schema...');
  
  // Try to insert a dummy row with all keys to see if it fails
  // Actually, better to use an RPC or just try a Select if we can
  // But since we can't easily inspect schema without admin, we can rely on error messages
  // OR we can just 'select' and see what we get back if we had data, but we don't.
  
  // Best way to check columns without admin access is to try to select them
  const { data, error } = await supabase
    .from('project_open_roles')
    .select('id, project_id, role, count, filled, description, skills')
    .limit(1);

  if (error) {
    console.error('❌ Error selecting columns:', error.message);
    if (error.message.includes('does not exist')) {
       console.log('👉 This confirms missing columns!');
    }
  } else {
    console.log('✅ Select success! All columns exist.');
  }
}

checkRolesSchema();
