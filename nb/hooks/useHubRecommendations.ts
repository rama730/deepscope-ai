import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Project } from "@/types/hub";
import { logger } from "@/lib/logger";
import { SupabaseError } from "@/types/realtime";

export interface UseHubRecommendationsReturn {
  recommendations: Project[];
  loading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

/**
 * RPC response type for recommended projects
 */
interface RecommendedProjectResponse {
  id: string;
  [key: string]: unknown;
}

/**
 * Hook to fetch personalized project recommendations
 * 
 * Uses RPC function to get recommended projects based on user preferences
 * and activity. Gracefully handles missing RPC function (non-critical feature).
 * 
 * @param userId - The user ID to get recommendations for
 * @param enabled - Whether recommendations are enabled (default: false)
 * @returns Object containing recommendations, loading state, error, and reload function
 * @example
 * ```tsx
 * const { recommendations, loading, error, reload } = useHubRecommendations(userId, true);
 * ```
 */
export function useHubRecommendations(userId: string | null, enabled: boolean = false): UseHubRecommendationsReturn {
  const supabase = createSupabaseBrowserClient();
  const [recommendations, setRecommendations] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadRecommendations = useCallback(async () => {
    if (!userId || !enabled) {
      setRecommendations([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('get_recommended_projects', {
        user_id_param: userId,
        limit_param: 10,
      });

      if (rpcError) {
        // RPC might not exist, that's okay - don't treat as error
        const errorCode = rpcError.code;
        const errorMessage = rpcError.message || String(rpcError);
        
        if (errorCode === '42883' || 
            errorMessage.includes('does not exist') || 
            errorMessage.includes('function') ||
            errorMessage.includes('42883')) {
          // Function doesn't exist - this is expected, just return empty
          setRecommendations([]);
          setLoading(false);
          return;
        }
        
        // For other RPC errors, throw to be caught by outer catch
        throw rpcError;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        // Fetch full project details for these IDs
        const responses = data as RecommendedProjectResponse[];
        const ids = responses.map((p) => (typeof p === 'object' && 'id' in p ? p.id : String(p))).filter(Boolean) as string[];
        if (ids.length > 0) {
          const { data: fullProjects, error: fetchError } = await supabase
            .from('projects')
            .select(`
              *,
              profiles:creator_id (
                full_name,
                username,
                avatar_url
              )
            `)
            .in('id', ids);

          if (fetchError) {
            throw fetchError;
          }

          if (fullProjects) {
            setRecommendations(fullProjects as Project[]);
          }
        }
      } else {
        setRecommendations([]);
      }
    } catch (err) {
      // Better error handling - check if it's actually an error or just a non-critical failure
      if (err && typeof err === 'object') {
        // Check if this is a "function does not exist" error - that's okay, just skip
        const supabaseError = err as SupabaseError;
        const errorCode = supabaseError.code;
        const errorMessage = supabaseError.message || String(err);
        
        // Check if error object is empty (no meaningful properties)
        const hasProperties = Object.keys(err).length > 0;
        const isEmptyError = !hasProperties || (!errorCode && !errorMessage);
        
        if (isEmptyError || 
            errorCode === '42883' || 
            errorMessage?.includes('does not exist') || 
            errorMessage?.includes('function') ||
            errorMessage?.includes('42883')) {
          // Empty error or function doesn't exist - this is non-critical, just return empty
          // Don't log empty errors
          setRecommendations([]);
          setError(null);
          setLoading(false);
          return;
        }
        
        // For other errors, extract details if available
        const errorDetails: SupabaseError = {
          message: errorMessage,
          code: errorCode || 'unknown'
        };
        
        // Only add these if they exist and are not empty
        if (supabaseError.details) errorDetails.details = supabaseError.details;
        if (supabaseError.hint) errorDetails.hint = supabaseError.hint;
        
        // Only log if there are meaningful details
        const hasMeaningfulError = errorDetails.message && 
                                  errorDetails.message !== 'Unknown error' && 
                                  errorDetails.message !== '[object Object]' &&
                                  errorDetails.message !== '{}';
        
        if (hasMeaningfulError) {
          logger.warn("Error loading recommendations (non-critical)", errorDetails);
        }
        
        const errorObj = err instanceof Error ? err : new Error(errorDetails.message || "Failed to load recommendations");
        setError(errorObj);
      } else if (err) {
        // Handle string or other error types
        const errorMessage = String(err);
        if (errorMessage && 
            errorMessage !== '[object Object]' && 
            errorMessage !== '{}' &&
            errorMessage.trim().length > 0) {
          logger.warn("Error loading recommendations (non-critical)", { message: errorMessage });
        }
        const error = err instanceof Error ? err : new Error(errorMessage || "Failed to load recommendations");
        setError(error);
      } else {
        // Empty or undefined error - don't log, just set empty state
        setError(null);
      }
      
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId, enabled]);

  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  return {
    recommendations,
    loading,
    error,
    reload: loadRecommendations,
  };
}
