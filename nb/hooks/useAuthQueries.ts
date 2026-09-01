import { useQuery } from '@tanstack/react-query';
import { STALE_TIMES } from "@/lib/config/query-config";

interface RateLimitResponse {
  allowed: boolean;
  attempts_remaining: number;
  locked?: boolean;
  locked_until?: string;
  message?: string;
}

interface ValidationResponse {
  success: boolean;
  data?: {
    isAvailable: boolean;
  };
  message?: string;
}

export const useRateLimitQuery = (email: string, actionType: 'login' | 'signup') => {
  return useQuery<RateLimitResponse>({
    queryKey: ['rate-limit', email, actionType],
    queryFn: async () => {
      if (!email) return { allowed: true, attempts_remaining: 5 };
      const response = await fetch('/api/auth/rate-limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: email.trim(),
          identifierType: 'email',
          actionType,
        }),
      });
      return response.json();
    },
    enabled: !!email,
    staleTime: STALE_TIMES.SHORT,
  });
};

export const useUsernameAvailabilityQuery = (username: string, excludeUserId?: string) => {
  return useQuery<ValidationResponse>({
    queryKey: ['username-availability', username, excludeUserId],
    queryFn: async () => {
      if (!username) return { success: true, data: { isAvailable: true } };
      // Corrected path from /api/v1/auth/check-username to /api/check-username
      const response = await fetch('/api/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.toLowerCase(),
          excludeUserId 
        }),
      });
      if (!response.ok) return { success: false, message: "Request failed" };
      try {
          return await response.json();
      } catch {
          return { success: false, message: "Invalid server response" };
      }
    },
    enabled: username.length >= 3,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useEmailAvailabilityQuery = (email: string) => {
  return useQuery<ValidationResponse>({
    queryKey: ['email-availability', email],
    queryFn: async () => {
      if (!email) return { success: true, data: { isAvailable: true } };
      // Correcting path assumption if needed, but keeping v1 for now if it exists there or assuming consistency
      // Previous check showed check-email in v1/auth, so keeping it but adding safety
      const response = await fetch('/api/v1/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!response.ok) return { success: false, message: "Request failed" };
      try {
        return await response.json();
      } catch {
        return { success: false, message: "Invalid server response" };
      }
    },
    enabled: !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
