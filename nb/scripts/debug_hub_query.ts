
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
// Load env vars from .env.local
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') }); // try .env first, then .env.local if needed, actually standard is .env.local usually overrides. 
// Just loading .env.local strictly as user probably has secrets there.
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase URL or Anon Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testQuery() {
  console.log('Testing Hub Projects Query...');
  
  const { error } = await supabase.from("projects").select(`
    id,
    title,
    profiles:creator_id(full_name, username, avatar_url),
    project_open_roles(count),
    project_collaborators(count),
    project_followers(count)
  `).limit(1);


  if (error) {
    console.error('Projects Query Failed:', error);
  } else {
    console.log('Projects Query Successful!');
  }

  // Test Bookmarks Permission (often a separate query in Hub)
  console.log('Testing Bookmarks Query...');
  const { error: bookmarksError } = await supabase.from("bookmarks").select("id").limit(1);
  if (bookmarksError) {
      console.error('Bookmarks Query Failed:', bookmarksError);
  } else {
      console.log('Bookmarks Query Successful!');
  }

  // Test Followed Projects Permission
  console.log('Testing Followed Projects Query...');
  const { error: followersError } = await supabase.from("project_followers").select("project_id").limit(1);
  if (followersError) {
      console.error('Followers Query Failed:', followersError);
  } else {
      console.log('Followers Query Successful!');
  }
}

testQuery();
