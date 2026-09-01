

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
    // Try current directory if looking up failed (though __dirname should be accurate relative to file)
    // or try standard root if running from root without __dirname reliance (though __dirname is safest for location relative to script)
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

async function debugTags() {
    console.log("Fetching posts tags...");
    const { data, error } = await supabase
        .from('posts')
        .select('id, tags')
        .limit(20);

    if (error) {
        console.error("Error fetching:", error);
        return;
    }

    console.log("Found posts:", data.length);
    data.forEach(p => {
        console.log('Post', p.id, ': tags type=', typeof p.tags, ', value=', p.tags);
    });
}

debugTags();
