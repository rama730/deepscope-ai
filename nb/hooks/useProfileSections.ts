import { useQuery } from '@tanstack/react-query';
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const supabase = createSupabaseBrowserClient();

export function useProfileSkills(userId: string) {
  return useQuery({
    queryKey: ['skills', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("skills")
        .select("*")
        .eq("user_id", userId)
        .order("is_featured", { ascending: false })
        .order("endorsement_count", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useProfileExperience(userId: string) {
  return useQuery({
    queryKey: ['experience', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experiences")
        .select("*")
        .eq("user_id", userId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useProfileEducation(userId: string) {
  return useQuery({
    queryKey: ['education', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("education")
        .select("*")
        .eq("user_id", userId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useProfileCertifications(userId: string) {
  return useQuery({
    queryKey: ['certifications', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certifications")
        .select("*")
        .eq("user_id", userId)
        .order("issue_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useProfileAchievements(userId: string) {
  return useQuery({
    queryKey: ['achievements', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .eq("user_id", userId)
        .order("date_received", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useProfileLanguages(userId: string) {
  return useQuery({
    queryKey: ['languages', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_languages")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useProfileVolunteering(userId: string) {
  return useQuery({
    queryKey: ['volunteering', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("volunteering")
        .select("*")
        .eq("user_id", userId)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useProfilePublications(userId: string) {
  return useQuery({
    queryKey: ['publications', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("publications")
        .select("*")
        .eq("user_id", userId)
        .order("publication_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useProfileSocialLinks(userId: string) {
  return useQuery({
    queryKey: ['socialLinks', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_links")
        .select("*")
        .eq("user_id", userId)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useProfileFeaturedItems(userId: string) {
  return useQuery({
    queryKey: ['featuredItems', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_items")
        .select("*")
        .eq("user_id", userId)
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useProfileRecommendations(userId: string) {
  return useQuery({
    queryKey: ['recommendations', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recommendations")
        .select(`
          *,
          author:author_id(full_name, username, avatar_url, headline)
        `)
        .eq("recipient_id", userId)
        .eq("status", "accepted")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

export function useProfileProjects(userId: string) {
  return useQuery({
    queryKey: ['projects', userId],
    queryFn: async () => {
      // Load projects where user is creator
      const { data: createdProjects, error: createdError } = await supabase
        .from("projects")
        .select("id, title, description, status, created_at")
        .eq("creator_id", userId)
        .order("created_at", { ascending: false });
      
      if (createdError) throw createdError;

      // Load projects where user is contributor
      const { data: contributorData, error: contributorError } = await supabase
        .from("project_collaborators")
        .select(`
          project_id,
          projects:project_id (
            id,
            title,
            description,
            status,
            created_at
          )
        `)
        .eq("user_id", userId);

      if (contributorError) throw contributorError;

      // Combine and mark role
      const createdWithRole = (createdProjects || []).map(p => ({ ...p, role: 'creator' }));
      const contributorProjects = (contributorData || [])
        .filter(c => c.projects)
        .map(c => ({ ...c.projects, role: 'contributor' }));
      
      // Merge and sort
      return [...createdWithRole, ...contributorProjects].sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!userId,
  });
}

export function useProfilePosts(userId: string) {
  return useQuery({
    queryKey: ['posts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("id, content, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

