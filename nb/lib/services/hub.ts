import { SupabaseClient } from "@supabase/supabase-js";
import { Project, HubFilters } from "@/types/hub";
import { PROJECT_STATUS, PROJECT_TYPE, SORT_OPTIONS } from "@/constants/hub";

interface FetchHubProjectsOptions {
  supabase: SupabaseClient;
  filters: HubFilters & {
    search?: string;
    includedIds?: string[];
  };
  pageSize?: number;
  pageParam?: any;
}

export async function fetchHubProjects({ 
  supabase, 
  filters, 
  pageSize = 24, 
  pageParam 
}: FetchHubProjectsOptions) {
  
  // Handle specific IDs (e.g. Trending) - Safe fallback for ID lists
  if (filters.includedIds) {
    if (filters.includedIds.length === 0) {
      return { projects: [], count: 0, nextPage: undefined };
    }
    
    // For ID lists, we use simple offset emulation if needed, or just fetch chunk
    // Use pageParam as offset number if it is a number
    const pageNum = typeof pageParam === 'number' ? pageParam : 0;
    const from = pageNum * pageSize;
    const to = from + pageSize - 1;
    const idsPage = filters.includedIds.slice(from, to + 1);
    
    if (idsPage.length === 0) {
      return { projects: [], count: filters.includedIds.length, nextPage: undefined };
    }

    const { data, count, error } = await supabase
      .from("projects")
      .select(`
        id,
        slug,
        title,
        description,
        short_description,
        status,
        project_type,
        creator_id,
        created_at,
        updated_at,
        view_count,
        tags,
        technologies_used,
        last_activity_at,
        profiles:creator_id(full_name, username, avatar_url),
        project_open_roles(id, role, count, filled),
        project_collaborators(user_id, role, profiles:user_id(full_name, username, avatar_url)),
        project_followers:project_followers(count)
      `)
      .in('id', idsPage);

    if (error) throw error;

    return {
      projects: data as unknown as Project[],
      count: count || 0,
      nextPage: (data?.length === idsPage.length && filters.includedIds.length > to + 1) ? pageNum + 1 : undefined
    };
  }

  // Standard Query Construction
  let query = supabase.from("projects").select(`
    id,
    slug,
    title,
    description,
    short_description,
    status,
    project_type,
    creator_id,
    created_at,
    updated_at,
    view_count,
    technologies_used,
    last_activity_at,
    profiles:creator_id(full_name, username, avatar_url),
    project_open_roles(id, role, count, filled),
    project_collaborators(user_id, role, profiles:user_id(full_name, username, avatar_url)),
    project_followers:project_followers(count)
  `, { count: 'estimated' }); // Removed 'tags' but kept estimated count for UI

  // Apply filters
  if (filters.status && filters.status !== PROJECT_STATUS.ALL) {
    query = query.eq("status", filters.status);
  }
  if (filters.type && filters.type !== PROJECT_TYPE.ALL) {
    query = query.eq("project_type", filters.type);
  }
  if (filters.search && filters.search.trim()) {
    query = query.textSearch('fts', filters.search.trim(), {
      type: 'websearch',
      config: 'english'
    });
  }
  if (filters.tech && filters.tech.length > 0) {
    query = query.contains('technologies_used', filters.tech);
  }

  // Sort & Cursor Logic
  const sortBy = filters.sort || SORT_OPTIONS.NEWEST;
  const cursor = pageParam as any;

  // Apply Cursor Filter if exists (and not using includedIds)
  if (cursor) {
    switch (sortBy) {
      case SORT_OPTIONS.POPULAR:
        query = query.or(`view_count.lt.${cursor.val},and(view_count.eq.${cursor.val},id.lt.${cursor.id})`);
        break;
      case SORT_OPTIONS.ALPHABETICAL:
        query = query.or(`title.gt.${cursor.val},and(title.eq.${cursor.val},id.gt.${cursor.id})`);
        break;
      case SORT_OPTIONS.RECENT_ACTIVITY:
        query = query.or(`last_activity_at.lt.${cursor.val},and(last_activity_at.eq.${cursor.val},id.lt.${cursor.id})`);
        break;
      case SORT_OPTIONS.NEWEST:
      default:
        query = query.or(`created_at.lt.${cursor.val},and(created_at.eq.${cursor.val},id.lt.${cursor.id})`);
        break;
    }
  }

  // Apply Order
  switch (sortBy) {
    case SORT_OPTIONS.POPULAR:
      query = query.order("view_count", { ascending: false }).order("id", { ascending: false });
      break;
    case SORT_OPTIONS.ALPHABETICAL:
      query = query.order("title", { ascending: true }).order("id", { ascending: true });
      break;
    case SORT_OPTIONS.RECENT_ACTIVITY:
      query = query.order("last_activity_at", { ascending: false, nullsFirst: false }).order("id", { ascending: false });
      break;
    case SORT_OPTIONS.NEWEST:
    default:
      query = query.order("created_at", { ascending: false }).order("id", { ascending: false });
      break;
  }

  // Pagination Limit
  query = query.limit(pageSize + 1);

  const { data, error, count } = await query;
  
  if (error) {
     if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist') || error.code === '42501') {
       return { projects: [], count: 0, nextPage: undefined };
    }
    throw error;
  }
  
  const projects = data as unknown as Project[];
  const hasNextPage = projects.length > pageSize;
  const result = hasNextPage ? projects.slice(0, pageSize) : projects;
  
  let nextCursor = undefined;
  if (hasNextPage && result.length > 0) {
    const lastItem = result[result.length - 1];
    if (lastItem) {
        switch (sortBy) {
        case SORT_OPTIONS.POPULAR:
            nextCursor = { val: lastItem.view_count || 0, id: lastItem.id };
            break;
        case SORT_OPTIONS.ALPHABETICAL:
            nextCursor = { val: lastItem.title, id: lastItem.id };
            break;
        case SORT_OPTIONS.RECENT_ACTIVITY:
            nextCursor = { val: lastItem.last_activity_at || lastItem.created_at, id: lastItem.id };
            break;
        case SORT_OPTIONS.NEWEST:
        default:
            nextCursor = { val: lastItem.created_at, id: lastItem.id };
            break;
        }
    }
  }

  return {
    projects: result,
    count: count || 0,
    nextPage: nextCursor
  };
}
