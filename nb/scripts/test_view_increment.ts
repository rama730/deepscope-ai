
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

async function testViewIncrement() {
    console.log("🔍 Finding latest project...");
    
    // Get the most recent project
    const { data: project, error: fetchError } = await supabase
        .from("projects")
        .select("id, title, view_count")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
        
    if (fetchError || !project) {
        console.error("❌ Could not find any project:", fetchError);
        return;
    }
    
    console.log(`📋 Found project: "${project.title}" (ID: ${project.id})`);
    console.log(`👁️ Current View Count: ${project.view_count}`);
    
    console.log("🚀 Calling increment_project_view_count RPC...");
    
    const { error: rpcError } = await supabase.rpc("increment_project_view_count", { 
        project_id_param: project.id 
    });
    
    if (rpcError) {
        console.error("❌ RPC FAILED:", rpcError);
        return;
    }
    
    console.log("✅ RPC call successful. Verifying update...");
    
    // Fetch again to verify
    const { data: updatedProject, error: refetchError } = await supabase
        .from("projects")
        .select("view_count")
        .eq("id", project.id)
        .single();
        
    if (refetchError) {
        console.error("❌ Could not refetch project:", refetchError);
        return;
    }
    
    console.log(`👁️ New View Count: ${updatedProject.view_count}`);
    
    if (updatedProject.view_count > (project.view_count || 0)) {
        console.log("✅ SUCCESS: View count incremented!");
    } else {
        console.log("❌ FAILURE: View count did not change.");
    }
}

testViewIncrement();
