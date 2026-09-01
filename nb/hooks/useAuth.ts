import { useAuthContext } from "@/components/providers/AuthProvider";

export interface UseAuthReturn {
  user: any; // Using any for compatibility or import User from @supabase/supabase-js
  isSignedIn: boolean;
  isLoading: boolean;
  error: Error | null;
  reload: () => Promise<void>;
}

/**
 * Hook to manage user authentication state.
 * Now acts as a wrapper around the global AuthContext to prevent duplicate requests.
 */
export function useAuth() {
  return useAuthContext();
}

