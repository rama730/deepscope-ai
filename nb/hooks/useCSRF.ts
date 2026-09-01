"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/lib/logger";
import { readJsonSafe } from "@/lib/api/client";

/**
 * Hook to manage CSRF token with automatic retry on failure
 * 
 * @returns Object containing token, loading state, refresh function, and verify function
 * @example
 * ```tsx
 * const { token, loading, refresh, verify } = useCSRF();
 * ```
 */
export function useCSRF() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const maxRetries = 3;

  const fetchCSRFToken = useCallback(async (isRetry = false) => {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/csrf-token", {
        method: "GET",
        credentials: "include", // Include cookies for CSRF token
        cache: "no-store", // Prevent Safari/edge caching causing token/cookie mismatches
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await readJsonSafe(response);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response isn't JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Parse JSON response
      let data;
      try {
        data = await readJsonSafe(response);
      } catch (parseError) {
        throw new Error("Invalid JSON response from server");
      }

      // Check for token in response (handle both flat and nested structures)
      const tokenValue = data.token || data.data?.token;
      if (tokenValue && typeof tokenValue === 'string') {
        setToken(tokenValue);
        setRetryCount(0); // Reset retry count on success
        setError(null); // Clear any previous errors
        setLoading(false);
        return;
      } else {
        throw new Error("No token in response");
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to fetch CSRF token");
      const errorMessage = error.message || "Unknown error";
      
      // Set error state for UI feedback
      if (!isRetry && retryCount >= maxRetries) {
        setError(errorMessage);
      }
      
      // Prepare error details for logging (avoid sensitive data)
      const errorDetails: Record<string, unknown> = {
        errorMessage,
        retryCount,
        isRetry,
      };
      
      // Add error type if available
      if (err instanceof TypeError) {
        errorDetails.errorType = "NetworkError";
      } else if (err instanceof SyntaxError) {
        errorDetails.errorType = "ParseError";
      } else if (err instanceof Error) {
        errorDetails.errorType = err.name || "Error";
      }
      
      // Log error (logger will sanitize sensitive data)
      try {
        logger.error("Failed to fetch CSRF token", errorDetails);
      } catch (logError) {
        // Fallback to console if logger fails
        console.error("[useCSRF] Failed to fetch CSRF token:", errorMessage, errorDetails);
      }
      
      // Retry with exponential backoff
      if (!isRetry && retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchCSRFToken(true);
        }, delay);
      } else {
        // If all retries exhausted or this was a retry, set loading to false
        setLoading(false);
      }
    }
  }, [retryCount]);

  useEffect(() => {
    fetchCSRFToken();
  }, [fetchCSRFToken]);

  const verifyToken = useCallback(async (tokenToVerify: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/verify-csrf", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenToVerify }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await readJsonSafe(response);
      return data?.valid === true || data?.data?.valid === true;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Failed to verify CSRF token");
      logger.error("Failed to verify CSRF token", { error: error.message });
      return false;
    }
  }, []);

  return { 
    token, 
    loading, 
    error,
    refresh: () => {
      setError(null);
      setRetryCount(0);
      fetchCSRFToken(false);
    }, 
    verify: verifyToken 
  };
}

