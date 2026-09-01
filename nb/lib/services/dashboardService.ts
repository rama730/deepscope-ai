import { SupabaseClient } from "@supabase/supabase-js";

export class DashboardService {
  static async getStats(supabase: SupabaseClient, userId: string) {
    const [
      { count: skillsCount },
      { count: projectsCount },
      { count: experienceCount },
      { count: educationCount }
    ] = await Promise.all([
      supabase.from('skills').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('featured_items').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('experiences').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('education').select('*', { count: 'exact', head: true }).eq('user_id', userId)
    ]);

    const { count: currentJobsCount } = await supabase
      .from('experiences')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('current', true);

    return {
      totalItems: (skillsCount || 0) + (projectsCount || 0) + (experienceCount || 0) + (educationCount || 0),
      activeItems: (currentJobsCount || 0) + (projectsCount || 0),
      projectsCount: projectsCount || 0,
      skillsCount: skillsCount || 0,
      filesCount: 0, // Mock for now as per original UI
      connectionsCount: 0 // Mock for now
    };
  }

  static async getActivity(supabase: SupabaseClient, userId: string) {
    const [
      { data: projects },
      { data: skills },
      { data: experiences }
    ] = await Promise.all([
      supabase.from('featured_items').select('id, title, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      supabase.from('skills').select('id, skill_name, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
      supabase.from('experiences').select('id, title, company, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(5),
    ]);

    const activity = [
      ...(projects?.map((p: any) => ({ type: 'project', title: p.title, date: p.created_at, description: 'Created a new project' })) || []),
      ...(skills?.map((s: any) => ({ type: 'skill', title: s.skill_name, date: s.created_at, description: 'Added a new skill' })) || []),
      ...(experiences?.map((e: any) => ({ type: 'experience', title: `${e.title} at ${e.company}`, date: e.created_at, description: 'Updated work experience' })) || [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return activity;
  }

  static async getSummary(supabase: SupabaseClient, userId: string, userEmail?: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('profile_strength, full_name, role')
      .eq('id', userId)
      .single();

    if (!profile) return null;

    return {
      profileStrength: profile.profile_strength || 0,
      userName: profile.full_name || userEmail?.split('@')[0] || 'User',
      role: profile.role,
      message: "Welcome back! Here's what's happening today."
    };
  }
}

