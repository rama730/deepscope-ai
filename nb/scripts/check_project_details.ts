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

async function checkProjectDetails() {
  console.log('🔍 Checking project details...\n');

  // Get the most recent project
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1);

  if (projectError) {
    console.error('❌ Error fetching projects:', projectError);
    return;
  }

  if (!projects || projects.length === 0) {
    console.log('❌ No projects found');
    return;
  }

  const project = projects[0];
  console.log('📋 Latest Project:', project.title);
  console.log('ID:', project.id);
  console.log('\n--- Database Columns Check ---');
  console.log('✓ title:', project.title ? '✅ EXISTS' : '❌ MISSING');
  console.log('✓ description:', project.description ? '✅ EXISTS' : '❌ MISSING');
  console.log('✓ short_description:', project.short_description !== undefined ? '✅ EXISTS (Value: ' + project.short_description + ')' : '❌ COLUMN MISSING');
  console.log('✓ problem_statement:', project.problem_statement !== undefined ? '✅ EXISTS (Value: ' + project.problem_statement + ')' : '❌ COLUMN MISSING');
  console.log('✓ solution_overview:', project.solution_overview !== undefined ? '✅ EXISTS (Value: ' + project.solution_overview + ')' : '❌ COLUMN MISSING');
  console.log('✓ custom_project_type:', project.custom_project_type !== undefined ? '✅ EXISTS (Value: ' + project.custom_project_type + ')' : '❌ COLUMN MISSING');
  console.log('✓ terms_and_conditions:', project.terms_and_conditions !== undefined ? '✅ EXISTS (Value: ' + project.terms_and_conditions + ')' : '❌ COLUMN MISSING');
  console.log('✓ visibility:', project.visibility !== undefined ? '✅ EXISTS (Value: ' + project.visibility + ')' : '❌ COLUMN MISSING');
  console.log('✓ lifecycle_stages:', project.lifecycle_stages ? '✅ EXISTS' : '❌ MISSING');
  console.log('✓ technologies_used:', project.technologies_used ? '✅ EXISTS' : '❌ MISSING');

  // Check Open Roles
  console.log('\n--- Open Roles Check ---');
  const { data: roles, error: rolesError } = await supabase
    .from('project_open_roles')
    .select('*')
    .eq('project_id', project.id);

  if (rolesError) {
    console.error('❌ Error fetching roles:', rolesError);
  } else {
    console.log(`Found ${roles?.length || 0} roles`);
    if (roles && roles.length > 0) {
      roles.forEach((role, idx) => {
        console.log(`  ${idx + 1}. ${role.role} (${role.count} positions)`);
      });
    } else {
      console.log('❌ No roles found for this project');
    }
  }

  // Check if columns exist in schema
  console.log('\n--- Schema Verification ---');
  const { data: columns, error: schemaError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'projects' 
      AND column_name IN ('problem_statement', 'solution_overview', 'lifecycle_stages', 'technologies_used')
      ORDER BY column_name;
    `
  });

  if (schemaError) {
    console.log('⚠️  Could not verify schema (RPC might not be available)');
  } else if (columns) {
    console.log('Available columns:', columns);
  }
}

checkProjectDetails().then(() => process.exit(0));
