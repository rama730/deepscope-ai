import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manual .env parsing
const envPath = path.resolve(__dirname, '../.env.local');
let envContent = '';
try {
    envContent = fs.readFileSync(envPath, 'utf-8');
} catch (e) {
    const rootEnv = path.resolve('.env.local');
    if (fs.existsSync(rootEnv)) {
        envContent = fs.readFileSync(rootEnv, 'utf-8');
    } else {
        console.warn("Could not find .env.local at", envPath, "or", rootEnv);
    }
}

const env: Record<string, string> = {};
if (envContent) {
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim();
    });
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase env vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
        async function check() {
            const { error } = await supabase.from('message_attachments').select('count', { count: 'exact', head: true });
            if (error) {
                console.log('Error:', error.message);
            } else {
                console.log('message_attachments table exists');
            }
        }
        check();
    
