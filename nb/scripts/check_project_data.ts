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

async function checkProjectData() {
  // Get the project ID (assuming it's the one from the screenshot or just list all)
  const { data: projects } = await supabase.from('projects').select('id, title, lifecycle_stages, current_stage_index, problem_statement, solution_overview').limit(1);
  
  if (!projects || projects.length === 0) {
    console.log('No projects found');
    return;
  }

  const projectId = projects[0].id;
  console.log(`Checking project: ${projects[0].title} (${projectId})`);
  console.log('Lifecycle Stages:', projects[0].lifecycle_stages);
  console.log('Current Stage Index:', projects[0].current_stage_index);
  console.log('Problem Statement:', projects[0].problem_statement);
  console.log('Solution Overview:', projects[0].solution_overview);

  // Check Open Roles
  const { data: roles, error: rolesError } = await supabase
    .from('project_open_roles')
    .select('*')
    .eq('project_id', projectId);
  
  if (rolesError) console.error('Error fetching roles:', rolesError);
  console.log('Open Roles:', roles?.length || 0);
  if (roles && roles.length > 0) console.log(roles);

  // Check Tasks (for Roadmap)
  const { data: tasks, error: tasksError } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId);

  if (tasksError) console.error('Error fetching tasks:', tasksError);
  console.log('Tasks:', tasks?.length || 0);
}

checkProjectData();
