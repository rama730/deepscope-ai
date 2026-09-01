import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export interface UserProfile {
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export function useCurrentUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset state when user changes (or on unmount/remount if user is different)
    if (!user) {
      setLoading(false);
      setProfile(null);
      return;
    }

    let isMounted = true;
    setLoading(true);

    const supabase = createSupabaseBrowserClient();

    async function loadUserProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, username, avatar_url')
          .eq('id', user!.id)
          .single();
        
        if (!isMounted) return;

        if (data && !error) {
          setProfile(data);
        } else {
          // Fallback to metadata if fetch fails or no profile found
          setProfile({
            full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || null,
            username: user?.user_metadata?.username || null,
            avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.avatar || null
          });
          if (error) {
             if (error.code !== 'PGRST116') {
                logger.error("Failed to load user profile", { error });
             }
          }
        }
      } catch (e) {
        if (!isMounted) return;
        logger.error("Exception loading user profile", { error: e });
        setProfile({
            full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || null,
            username: user?.user_metadata?.username || null,
            avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.avatar || null
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadUserProfile();

    return () => {
      isMounted = false;
    };
  }, [user]);

  return { profile, loading };
}
