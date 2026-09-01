import { SupabaseClient } from "@supabase/supabase-js";

export interface ProjectTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high" | "urgent";
  assigned_to: string | null;
  created_by: string;
  due_date: string | null;
  created_at: string;
  updated_at: string;
  assigned_to_profile?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
  uploader_profile?: {
    full_name: string | null;
    username: string | null;
  };
}

export interface ProjectActivity {
  id: string;
  event_type: string;
  description: string;
  actor_id: string;
  created_at: string;
  metadata: any;
  profiles?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export class ProjectService {
  static async getTasks(supabase: SupabaseClient, projectId: string, filters: any = {}) {
    let query = supabase
      .from("project_tasks")
      .select("*, assigned_to_profile:assigned_to(full_name, username, avatar_url), created_by_profile:created_by(full_name, username)", { count: "exact" })
      .eq("project_id", projectId);

    // Archive handling: default is "hide archived". When archived=1/true, include archived rows as well.
    const showArchived =
      filters.archived === "1" ||
      filters.archived === "true" ||
      filters.archived === true;
    if (!showArchived) {
      query = query.eq("is_deleted", false);
    }

    if (filters.status && filters.status !== "all") {
      const statuses = filters.status.split(",");
      query = query.in("status", statuses);
    }

    if (filters.priority && filters.priority !== "all") {
      const priorities = filters.priority.split(",");
      query = query.in("priority", priorities);
    }

    if (filters.sprint) {
      if (filters.sprint === "backlog") {
        query = query.is("sprint_id", null);
      } else {
        query = query.eq("sprint_id", filters.sprint);
      }
    }

    const sortField = filters.task_sort || "created_at";
    const ascending = filters.task_order === "asc";
    query = query.order(sortField, { ascending });

    if (filters.limit) {
      const page = filters.page || 1;
      const from = (page - 1) * filters.limit;
      const to = from + filters.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;
    if (error) throw error;
    return { data: data as ProjectTask[], count };
  }

  static async getFiles(supabase: SupabaseClient, projectId: string, filters: any = {}) {
    let query = supabase
      .from("project_files")
      .select("*, uploader_profile:uploaded_by(full_name, username)")
      .eq("project_id", projectId);

    const sortField = filters.file_sort || "created_at";
    const ascending = filters.file_order === "asc";
    query = query.order(sortField, { ascending });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as ProjectFile[];
  }

  static async getActivity(supabase: SupabaseClient, projectId: string, limit: number = 100) {
    const { data, error } = await supabase
      .from("project_activity_events")
      .select("*, profiles:actor_id(full_name, username, avatar_url)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as ProjectActivity[];
  }

  static async getUpdates(supabase: SupabaseClient, projectId: string, limit: number = 10) {
    const { data, error } = await supabase
      .from("project_updates")
      .select("*, profiles:created_by(full_name, username, avatar_url)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }
}
