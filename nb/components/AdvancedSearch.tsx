"use client";

import { useState, useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Search, Filter, Calendar, User, Heart, X, Bookmark } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface SearchFilters {
  query: string;
  fromUser?: string;
  dateRange?: "day" | "week" | "month" | "year" | "custom";
  customStartDate?: string;
  customEndDate?: string;
  mediaType?: "all" | "image" | "video" | "gif";
  minLikes?: number;
  hasMedia?: boolean;
  postType?: "all" | "standard" | "poll" | "project_update";
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  likes_count: number;
  comments_count: number;
  media_urls?: any;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export default function AdvancedSearch() {
  const supabase = createSupabaseBrowserClient();
  const [filters, setFilters] = useState<SearchFilters>({ query: "" });
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [searchName, setSearchName] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadSavedSearches();
  }, []);

  useEffect(() => {
    if (filters.query.trim()) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        performSearch();
      }, 500);
    } else {
      setResults([]);
    }
  }, [filters]);

  async function loadSavedSearches() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setSavedSearches(data || []);
  }

  async function performSearch() {
    setLoading(true);

    try {
      let query = supabase
        .from("posts")
        .select(
          `
          id,
          content,
          created_at,
          user_id,
          likes_count,
          comments_count,
          post_type,
          profiles:user_id (
            username,
            full_name,
            avatar_url
          )
        `
        )
        .order("created_at", { ascending: false })
        .limit(50);

      // Full-text search
      if (filters.query.trim()) {
        query = query.textSearch("search_vector", filters.query.trim());
      }

      // Filter by user
      if (filters.fromUser) {
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", filters.fromUser)
          .single();

        if (userProfile) {
          query = query.eq("user_id", userProfile.id);
        }
      }

      // Filter by date range
      if (filters.dateRange && filters.dateRange !== "custom") {
        const now = new Date();
        const ranges = {
          day: 1,
          week: 7,
          month: 30,
          year: 365,
        };
        const days = ranges[filters.dateRange];
        const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
        query = query.gte("created_at", since.toISOString());
      } else if (filters.dateRange === "custom" && filters.customStartDate) {
        query = query.gte("created_at", filters.customStartDate);
        if (filters.customEndDate) {
          query = query.lte("created_at", filters.customEndDate);
        }
      }

      // Filter by post type
      if (filters.postType && filters.postType !== "all") {
        query = query.eq("post_type", filters.postType);
      }

      // Filter by minimum likes
      if (filters.minLikes && filters.minLikes > 0) {
        query = query.gte("likes_count", filters.minLikes);
      }

      const { data } = await query;
      setResults((data as unknown as Post[]) || []);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSearch() {
    if (!searchName.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("saved_searches").insert({
      user_id: user.id,
      query: filters.query,
      filters: filters,
      name: searchName,
    });

    if (!error) {
      setSearchName("");
      loadSavedSearches();
    }
  }

  async function loadSavedSearch(search: any) {
    setFilters({ query: search.query, ...search.filters });
  }

  async function deleteSavedSearch(id: string) {
    await supabase.from("saved_searches").delete().eq("id", id);
    loadSavedSearches();
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Search Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search posts..."
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${showFilters
              ? "bg-blue-100 text-blue-600"
              : "bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
              }`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                From User
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="@username"
                  value={filters.fromUser || ""}
                  onChange={(e) =>
                    setFilters({ ...filters, fromUser: e.target.value })
                  }
                  className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Date Range
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <select
                  value={filters.dateRange || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      dateRange: e.target.value as any,
                    })
                  }
                  className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All time</option>
                  <option value="day">Last 24 hours</option>
                  <option value="week">Last 7 days</option>
                  <option value="month">Last 30 days</option>
                  <option value="year">Last year</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Post Type
              </label>
              <select
                value={filters.postType || "all"}
                onChange={(e) =>
                  setFilters({ ...filters, postType: e.target.value as any })
                }
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All types</option>
                <option value="standard">Standard posts</option>
                <option value="poll">Polls</option>
                <option value="project_update">Project updates</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Minimum Likes
              </label>
              <div className="relative">
                <Heart className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={filters.minLikes || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      minLikes: parseInt(e.target.value) || undefined,
                    })
                  }
                  className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Save Search */}
        {filters.query && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-700">
            <input
              type="text"
              placeholder="Name this search..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="flex-1 px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={saveSearch}
              disabled={!searchName.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Bookmark className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Saved Searches */}
      {savedSearches.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 mb-4">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50 mb-3">Saved Searches</h3>
          <div className="space-y-2">
            {savedSearches.map((search) => (
              <div
                key={search.id}
                className="flex items-center justify-between p-2 hover:bg-zinc-50 dark:bg-zinc-900 rounded-lg"
              >
                <button
                  onClick={() => loadSavedSearch(search)}
                  className="flex-1 text-left"
                >
                  <p className="font-medium text-zinc-900 dark:text-zinc-50">{search.name}</p>
                  <p className="text-sm text-zinc-500">{search.query}</p>
                </button>
                <button
                  onClick={() => deleteSavedSearch(search.id)}
                  className="p-1 text-zinc-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : results.length === 0 && filters.query ? (
          <div className="text-center py-12 text-zinc-500">
            <Search className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
            <p>No results found</p>
          </div>
        ) : (
          results.map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="block bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 hover:border-zinc-300 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Image
                  src={post.profiles.avatar_url || "/default-avatar.png"}
                  alt=""
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {post.profiles.full_name}
                    </span>
                    <span className="text-zinc-500">
                      @{post.profiles.username}
                    </span>
                  </div>
                  <p className="text-zinc-900 dark:text-zinc-50 whitespace-pre-wrap mb-2">
                    {post.content}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-zinc-500">
                    <span>{post.likes_count} likes</span>
                    <span>{post.comments_count} comments</span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}


