"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { Loader2, Eye, EyeOff, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import { useCSRF } from "@/hooks/useCSRF";

interface ResetPasswordClientProps {
  initialError?: string;
}

export default function ResetPasswordClient({ initialError }: ResetPasswordClientProps = {}) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError || null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const { token: csrfToken } = useCSRF();

  useEffect(() => {
    // Quick session check - server-side already validated, so this should be instant
    // We do a minimal check just to ensure session is still valid
    const checkSession = async () => {
      try {
        // Use getSession which is cached and fast
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          setSessionValid(false);
          router.push("/forgot-password?error=" + encodeURIComponent("Invalid or expired reset link. Please request a new one."));
        } else {
          setSessionValid(true);
        }
      } catch (err) {
        setSessionValid(false);
        router.push("/forgot-password?error=" + encodeURIComponent("Session validation failed. Please try again."));
      }
    };

    // Only check if we don't have an initial error (which means server already validated)
    if (!initialError) {
      // Set as valid immediately since server already checked, then verify quickly
      setSessionValid(true);
      checkSession();
    } else {
      // If we have an initial error, session is invalid
      setSessionValid(false);
    }
  }, [supabase, router, initialError]);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Verify CSRF token
    if (!csrfToken) {
      setError("Security token not ready. Please wait...");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verify CSRF token
      const csrfResponse = await fetch("/api/auth/verify-csrf", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
          ...(csrfToken && { "X-CSRF-Token": csrfToken }),
        },
        body: JSON.stringify({ token: csrfToken }),
      });

      const csrfData = await csrfResponse.json();
      const csrfValid = csrfData?.valid === true || csrfData?.data?.valid === true;
      if (!csrfValid) {
        setError("Security verification failed. Please refresh the page and try again.");
        setLoading(false);
        return;
      }

      // Server-side password validation
      const { data: { user } } = await supabase.auth.getUser();
      const passwordValidationResponse = await fetch("/api/auth/validate-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          email: user?.email,
          username: user?.user_metadata?.username,
        }),
      });

      const passwordValidation = await passwordValidationResponse.json();
      if (!passwordValidation.valid) {
        setError(passwordValidation.errors?.[0] || "Password does not meet security requirements.");
        setLoading(false);
        return;
      }

      // Update password using Supabase
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message || "Failed to update password. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Clear the reset pending cookie
      await fetch("/api/auth/complete-reset", { method: "POST" });

      setTimeout(() => {
        router.push("/login?message=Password reset successful. Please log in with your new password.");
      }, 2000);
    } catch (err: any) {
      setError(err?.message || "An error occurred. Please try again.");
      setLoading(false);
    }
  }

  // Show loading state while checking session
  if (sessionValid === null && !initialError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-black">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-zinc-200 dark:border-zinc-800">
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
              <p className="text-zinc-500 dark:text-zinc-400">Verifying reset link...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render form if session is invalid
  if (sessionValid === false) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-black">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-8 border border-zinc-200 dark:border-zinc-800">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
              Reset Your Password
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400">
              Enter your new password below
            </p>
          </div>

          {success ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-2">
                Password Reset Successful!
              </h2>
              <p className="text-zinc-500 dark:text-zinc-400">
                Redirecting to login...
              </p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter new password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {password && <PasswordStrengthMeter password={password} />}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Confirm new password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    <XCircle size={14} />
                    Passwords do not match
                  </p>
                )}
                {confirmPassword && password === confirmPassword && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 size={14} />
                    Passwords match
                  </p>
                )}
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    await fetch("/api/auth/complete-reset", { method: "POST" });
                    router.push("/login");
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 bg-transparent border-none cursor-pointer"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
