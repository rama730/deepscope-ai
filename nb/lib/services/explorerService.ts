import { SupabaseClient } from "@supabase/supabase-js";
import type { Post } from "@/components/explorer/types";

export class ExplorerService {
  /**
   * Tokenizes post content into standard parts for efficient rendering.
   */
  static tokenizeContent(content: string): any[] {
    if (!content) return [];

    const CODE_BLOCK_REGEX = /```(\w+)?\n([\s\S]*?)```/g;
    const URL_TAG_REGEX = /((?:https?:\/\/[^\s]+)|(?:#|@)\w+|(?:\/)[A-Za-z0-9\-\u2010\u2011\u2012\u2013\u2014\u2015\u2212]+)/g;

    const tokens: any[] = [];
    let lastIndex = 0;
    let match;

    while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
      // Text before code block
      if (match.index > lastIndex) {
        const textSegment = content.substring(lastIndex, match.index);
        ExplorerService.tokenizeTextSegment(textSegment, URL_TAG_REGEX, tokens);
      }

      // Code Block
      tokens.push({
        type: 'code',
        content: match[0],
        language: match[1] || 'text',
        code: match[2] || '',
      });

      lastIndex = CODE_BLOCK_REGEX.lastIndex;
    }

    // Remaining text
    if (lastIndex < content.length) {
      const textSegment = content.substring(lastIndex);
      ExplorerService.tokenizeTextSegment(textSegment, URL_TAG_REGEX, tokens);
    }

    return tokens;
  }

  private static tokenizeTextSegment(text: string, regex: RegExp, tokens: any[]) {
    const parts = text.split(regex);
    for (const part of parts) {
      if (!part) continue;

      if (part.match(/^https?:\/\//)) {
        tokens.push({ type: 'link', content: part, url: part });
      } else if (part.startsWith('#')) {
        tokens.push({ type: 'tag', content: part, tagName: part.slice(1) });
      } else if (part.startsWith('@')) {
        tokens.push({ type: 'mention', content: part, username: part.slice(1) });
      } else if (part.startsWith('/')) {
        tokens.push({ type: 'project', content: part, slug: part.slice(1) });
      } else {
        tokens.push({ type: 'text', content: part });
      }
    }
  }

  /**
   * Transforms raw RPC response into domain Post object.
   * Centralizes mapping logic for both SSR and Client-side fetching.
   */
  static transformPost(p: any): Post {
    // Level 2: Pre-extract first URL for preview to avoid regex in render loop
    const content = p.content || "";
    const tokens = ExplorerService.tokenizeContent(content);
    
    // Find first URL from tokens for preview
    const firstUrl = tokens.find(t => t.type === 'link')?.url || null;

    return {
      ...p,
      content,
      tokens,
      firstUrl,
      profiles: {
// ...
        username: p.author_username,
        full_name: p.author_full_name,
        avatar_url: p.author_avatar_url,
        bio: p.author_bio,
        location: p.author_location,
        website: p.author_website,
        created_at: p.author_created_at,
      },
      project: p.project_title
        ? {
            id: p.project_id || "",
            title: p.project_title,
            status: p.project_status || null,
            project_type: p.project_type || null,
            custom_project_type: null,
            slug: p.project_slug,
          }
        : null,
      parent_post: p.parent_post_id
        ? {
            user_id: p.parent_post_user_id || "",
            profiles: {
              username: p.parent_author_username || null,
              full_name: p.parent_author_full_name || null,
            },
          }
        : null,
      quoted_post: p.quoted_post_id
        ? {
            id: p.quoted_post_id,
            content: p.quoted_content || "",
            created_at: p.quoted_post_created_at || "",
            user_id: p.quoted_post_user_id || "",
            media: p.quoted_media ? { type: "mixed", url: p.quoted_media } : null,
            profiles: {
              username: p.quoted_author_username || null,
              full_name: p.quoted_author_full_name || null,
              avatar_url: p.quoted_author_avatar_url || null,
            },
          }
        : null,
      user_has_liked: !!p.has_liked,
      user_has_saved: !!p.has_saved,
      likes_count: p.likes_count || 0,
      comments_count: p.comments_count || 0,
      reposts_count: p.reposts_count || 0,
      saved_count: p.saved_count || p.bookmarks_count || 0,
      views_count: p.views_count || 0,
      is_reply: !!p.parent_post_id,
      // Perf: Cache timestamp to avoid repeated new Date() calls during sorting/grouping
      _timestamp: new Date(p.created_at).getTime(),
    };
  }

  /**
   * Fetches the enriched explorer feed using the monolithic RPC.
   */
  static async getFeed(
    supabase: SupabaseClient,
    params: {
      userId: string | null;
      tab?: string;
      typeFilter?: string;
      timeFilter?: string;
      searchQuery?: string | null;
      tag?: string | null;
      cursor?: string | null;
      limit?: number;
    }
  ): Promise<Post[]> {
    const { data, error } = await supabase.rpc("get_explorer_feed", {
      p_user_id: params.userId ?? null,
      p_limit: params.limit || 20,
      p_cursor: params.cursor || null,
      p_tab: params.tab || "for-you",
      p_type_filter: params.typeFilter || "all",
      p_time_filter: params.timeFilter || "all",
      p_search_query: params.searchQuery || null,
      p_tag: params.tag || null,
    });

    if (error) {
      console.error("Feed error details:", JSON.stringify(error, null, 2));
      throw error;
    }

    return (data || []).map((p: any) => ExplorerService.transformPost(p));
  }
}
