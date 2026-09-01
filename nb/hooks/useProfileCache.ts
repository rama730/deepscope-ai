/**
 * Profile Cache Hook - Global LRU cache for user profiles
 * 
 * Provides efficient profile fetching with:
 * - In-memory LRU cache with configurable TTL
 * - Batch fetching for multiple profiles
 * - Automatic cache invalidation
 */

"use client";

import { useCallback, useRef, useMemo } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cacheManager } from "@/lib/utils/cache-manager";

export interface CachedProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  last_active_at?: string | null;
  cachedAt: number;
}

interface ProfileCacheEntry {
  profile: CachedProfile;
  expiresAt: number;
}

// Global cache instance (singleton)
const globalCache = new Map<string, ProfileCacheEntry>();
const MAX_CACHE_SIZE = 500;
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Pending fetch promises to dedupe concurrent requests
const pendingFetches = new Map<string, Promise<CachedProfile | null>>();

// Register with unified cache manager
if (typeof window !== 'undefined') {
  cacheManager.register('ProfileCache', () => globalCache.clear(), 10);
}

/**
 * Evict oldest entries when cache exceeds max size
 */
function evictOldest() {
  if (globalCache.size <= MAX_CACHE_SIZE) return;
  
  const entries = Array.from(globalCache.entries());
  entries.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
  
  const toEvict = entries.slice(0, entries.length - MAX_CACHE_SIZE);
  for (const [key] of toEvict) {
    globalCache.delete(key);
  }
}

/**
 * Check if a cache entry is still valid
 */
function isValid(entry: ProfileCacheEntry): boolean {
  return Date.now() < entry.expiresAt;
}

export function useProfileCache(ttlMs: number = DEFAULT_TTL_MS) {
  const supabaseRef = useRef(createSupabaseBrowserClient());
  
  /**
   * Get a single profile from cache or fetch it
   */
  const getProfile = useCallback(async (userId: string): Promise<CachedProfile | null> => {
    if (!userId) return null;
    
    // Check cache
    const cached = globalCache.get(userId);
    if (cached && isValid(cached)) {
      return cached.profile;
    }
    
    // Check if already fetching
    const pending = pendingFetches.get(userId);
    if (pending) {
      return pending;
    }
    
    // Fetch from database
    const fetchPromise = (async () => {
      try {
        const { data, error } = await supabaseRef.current
          .from('profiles')
          .select('id, full_name, username, avatar_url, last_active_at')
          .eq('id', userId)
          .single();
        
        if (error || !data) {
          return null;
        }
        
        const profile: CachedProfile = {
          ...data,
          cachedAt: Date.now()
        };
        
        // Cache the result
        globalCache.set(userId, {
          profile,
          expiresAt: Date.now() + ttlMs
        });
        evictOldest();
        
        return profile;
      } finally {
        pendingFetches.delete(userId);
      }
    })();
    
    pendingFetches.set(userId, fetchPromise);
    return fetchPromise;
  }, [ttlMs]);
  
  /**
   * Get multiple profiles efficiently (batch fetch)
   */
  const getProfiles = useCallback(async (userIds: string[]): Promise<Map<string, CachedProfile>> => {
    const result = new Map<string, CachedProfile>();
    const toFetch: string[] = [];
    
    // Check cache first
    for (const userId of userIds) {
      if (!userId) continue;
      
      const cached = globalCache.get(userId);
      if (cached && isValid(cached)) {
        result.set(userId, cached.profile);
      } else {
        toFetch.push(userId);
      }
    }
    
    // Batch fetch missing profiles
    if (toFetch.length > 0) {
      try {
        const { data, error } = await supabaseRef.current
          .from('profiles')
          .select('id, full_name, username, avatar_url, last_active_at')
          .in('id', toFetch);
        
        if (!error && data) {
          for (const profile of data) {
            const cachedProfile: CachedProfile = {
              ...profile,
              cachedAt: Date.now()
            };
            
            globalCache.set(profile.id, {
              profile: cachedProfile,
              expiresAt: Date.now() + ttlMs
            });
            
            result.set(profile.id, cachedProfile);
          }
          evictOldest();
        }
      } catch (err) {
        console.warn("Error batch fetching profiles:", err);
      }
    }
    
    return result;
  }, [ttlMs]);
  
  /**
   * Invalidate a cached profile
   */
  const invalidate = useCallback((userId: string) => {
    globalCache.delete(userId);
  }, []);
  
  /**
   * Clear all cached profiles
   */
  const clearAll = useCallback(() => {
    globalCache.clear();
  }, []);
  
  /**
   * Get cached profile synchronously (returns null if not cached)
   */
  const getCached = useCallback((userId: string): CachedProfile | null => {
    const cached = globalCache.get(userId);
    if (cached && isValid(cached)) {
      return cached.profile;
    }
    return null;
  }, []);
  
  /**
   * Pre-warm cache with known profiles
   */
  const prewarm = useCallback((profiles: Array<{ id: string; full_name?: string | null; username?: string | null; avatar_url?: string | null; last_active_at?: string | null }>) => {
    for (const profile of profiles) {
      if (!profile.id) continue;
      
      const cachedProfile: CachedProfile = {
        id: profile.id,
        full_name: profile.full_name ?? null,
        username: profile.username ?? null,
        avatar_url: profile.avatar_url ?? null,
        last_active_at: profile.last_active_at ?? null,
        cachedAt: Date.now()
      };
      
      globalCache.set(profile.id, {
        profile: cachedProfile,
        expiresAt: Date.now() + ttlMs
      });
    }
    evictOldest();
  }, [ttlMs]);
  
  return useMemo(() => ({
    getProfile,
    getProfiles,
    invalidate,
    clearAll,
    getCached,
    prewarm,
    cacheSize: globalCache.size
  }), [getProfile, getProfiles, invalidate, clearAll, getCached, prewarm]);
}

/**
 * Standalone functions for use outside React components
 */
export const ProfileCache = {
  get(userId: string): CachedProfile | null {
    const cached = globalCache.get(userId);
    if (cached && isValid(cached)) {
      return cached.profile;
    }
    return null;
  },
  
  set(profile: CachedProfile, ttlMs: number = DEFAULT_TTL_MS) {
    globalCache.set(profile.id, {
      profile,
      expiresAt: Date.now() + ttlMs
    });
    evictOldest();
  },
  
  invalidate(userId: string) {
    globalCache.delete(userId);
  },
  
  clear() {
    globalCache.clear();
  },
  
  get size() {
    return globalCache.size;
  }
};
