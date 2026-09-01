import { Profile } from "./profile";

export interface Project {
  id: string;
  title: string;
  description: string | null;
  short_description?: string | null;
  status: string;
  project_type?: string | null;
  creator_id: string;
  created_at: string;
  updated_at?: string;
  view_count?: number;
  tags?: string[];
  technologies_used?: string[];
  profiles: {
    full_name: string | null;
    username: string | null;
    avatar_url?: string | null;
  };
  project_open_roles?: OpenRole[] | { count: number }[];
  project_collaborators?: any[] | { count: number }[];
  project_followers?: any[] | { count: number }[];
  [key: string]: any;
}

export interface OpenRole {
  id: string;
  title: string;
  description?: string | null;
  project_id: string;
  created_at?: string;
  [key: string]: any;
}

export interface User extends Profile {
  // User type extends Profile
}

export interface Collection {
  id: string;
  name: string;
  is_public: boolean;
  owner_id: string;
  created_at?: string;
  project_count?: number;
  display_order?: number | null;
  description?: string | null;
}

export interface FilterPreset {
  id: string;
  name: string;
  user_id: string;
  filters: {
    status: string;
    type: string;
    tech: string[];
    sort: string;
  };
  created_at?: string;
}

export interface HubFilters {
  status: string;
  type: string;
  tech: string[];
  sort: string;
  search?: string;
  includedIds?: string[];
}

export interface UserPreferences {
  hub_view_mode?: 'grid' | 'list';
  hub_sort_by?: string;
  hub_filters?: {
    status?: string;
    type?: string;
    tech?: string[];
  };
}
