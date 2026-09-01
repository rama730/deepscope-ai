export type FeedPostTypeFilter =
  | "all"
  | "standard"
  | "project_update"
  | "project_idea"
  | "achievement"
  | "collaboration"
  | "media"
  | "poll";

export type FeedTimeFilter = "all" | "today" | "week" | "month";
export type SortOption = "newest" | "most_liked" | "most_comments" | "trending";

export type ContentToken =
  | { type: 'text'; content: string }
  | { type: 'tag'; content: string; tagName: string }
  | { type: 'mention'; content: string; username: string }
  | { type: 'link'; content: string; url: string }
  | { type: 'project'; content: string; slug: string }
  | { type: 'code'; content: string; language: string; code: string };

export interface Post {
  id: string;
  content: string;
  tokens?: ContentToken[]; // Pre-parsed tokens for efficient rendering
  created_at: string;
  user_id: string;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  saved_count: number;
  views_count: number;
  _timestamp?: number;
  firstUrl?: string | null;
  edited_at?: string | null;
  parent_post_id?: string | null;
  thread_root_id?: string | null;
  is_reply?: boolean;
  reply_count?: number;
  quoted_post_id?: string | null;
  is_quote?: boolean;
  post_type?: string | null;
  project_id?: string | null;
  project_update_id?: string | null;
  project?: {
    id: string;
    title: string;
    description?: string | null;
    status: string | null;
    project_type: string | null;
    custom_project_type: string | null;
    slug?: string; // Added to support navigation
    project_open_roles?: {
      id: string;
      role: string;
      count: number;
      skills: string[];
    }[];
  } | null;
  project_idea_id?: string | null;
  collaboration_data?: any;
  poll_data?: any;
  content_warning?: string | null;
  media?: {
    type: string; // 'image', 'video', 'link', 'gif', 'mixed'
    urls?: string[];
    url?: string;
    items?: any[];
    metadata?: any;
  } | null;
  link_preview?: any;
  cta?: {
    type: string;
    text?: string;
    label?: string;
    link: string;
  } | null;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  parent_post?: {
    user_id: string;
    profiles: {
      username: string | null;
      full_name: string | null;
    } | null;
  } | null;
  quoted_post?: {
    id: string;
    content: string;
    created_at: string;
    user_id: string;
    media?: any;
    profiles: {
      username: string | null;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  } | null;
  tags?: string[] | null;
  mentions?: string[] | null;
  user_has_liked?: boolean;
  user_has_saved?: boolean;
  // Enriched fields for specific post types
  project_idea_details?: {
    id: string;
    title: string;
    short_description: string;
    problem_statement: string;
    roles_needed: string[];
    status: string;
    likes_count: number;
    comments_count: number;
    converted_to_project_id: string | null;
  } | null;
  poll_counts?: number[] | null;
  user_poll_vote?: number | null;
  project_update_details?: {
    tasks?: any[];
    files?: any[];
  } | null;
  parent_post_details?: Post | null;
  thread_ancestors?: Post[] | null;
}
