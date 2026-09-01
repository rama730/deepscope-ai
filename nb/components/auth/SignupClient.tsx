"use client";

import { useState, useEffect, Suspense, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import { AuthHeader } from "@/components/auth/AuthHeader";
import { CredentialInput } from "@/components/auth/CredentialInput";
import { OAuthProviders } from "@/components/auth/OAuthProviders";
import SecurityIndicators from "@/components/auth/SecurityIndicators";
import UsernameInput from "@/components/UsernameInput";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";
import { useAuthState } from "@/hooks/useAuthState";
import { signupAction } from "@/app/(auth)/actions";
import { toast } from "sonner";

// Lazy load animation component for performance
const SignupAnimation = nextDynamic(
  () => import("@/components/auth/SignupAnimation"),
  {
    loading: () => <div className="h-full w-full bg-zinc-900 animate-pulse" />,
    ssr: false
  }
);

export default function SignupClient() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { state, startAuth, setSuccess, setError } = useAuthState();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameValid, setUsernameValid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cardActive, setCardActive] = useState(false);
  const [isPasswordActive, setIsPasswordActive] = useState(false);

  // Card entrance animation
  useEffect(() => {
    const card = document.getElementById("signupCard");
    if (card) {
      requestAnimationFrame(() => {
        setTimeout(() => setCardActive(true), 800);
      });
    }
  }, []);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!usernameValid) {
      toast.error("Please choose a valid username");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("username", username); // Ensure the latest username is sent

    startAuth("email");

    startTransition(async () => {
      const result = await signupAction(formData);

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else {
        setSuccess();
        toast.success("Account created! Please verify your email.");
        setTimeout(() => router.push("/onboarding"), 1500);
      }
    });
  };

  const handleOAuthLogin = (provider: "google" | "github") => {
    startAuth(provider);
    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent("/explorer")}`;

    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    }).catch(err => {
      setError(err.message);
      toast.error(err.message);
    });
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div
        id="signupCard"
        className={`login-card relative flex w-full max-w-[900px] h-[650px] bg-white dark:bg-zinc-900 rounded-[30px] shadow-2xl overflow-hidden transition-all duration-1000 ${cardActive ? 'opacity-100' : 'opacity-0 scale-95'}`}
        style={{ viewTransitionName: 'auth-card' } as any}
      >

        {/* Left Side: Animation */}
        <div className="hidden md:flex w-1/2 bg-zinc-900 overflow-hidden">
          <Suspense fallback={<div className="w-full h-full bg-zinc-900 animate-pulse" />}>
            <SignupAnimation isBlurred={isPasswordActive} />
          </Suspense>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-start overflow-y-auto">
          <AuthHeader
            subtitle={state.status === "success" ? "Registration successful!" : "Join our creative community"}
          />

          <form onSubmit={handleSignup} className="space-y-4">
            <CredentialInput
              id="fullName"
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={isPending}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Username</label>
              <UsernameInput
                value={username}
                onChange={setUsername}
                onValidation={setUsernameValid}
                disabled={isPending}
              />
            </div>

            <div style={{ viewTransitionName: 'auth-input-email' } as any}>
              <CredentialInput
                id="email"
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                autoComplete="username"
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2" style={{ viewTransitionName: 'auth-input-password' } as any}>
              <CredentialInput
                id="password"
                label="Password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setIsPasswordActive(true)}
                onBlur={() => setIsPasswordActive(false)}
                required
                disabled={isPending}
              />
              <PasswordStrengthMeter password={password} />
            </div>

            <CredentialInput
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isPending}
              error={confirmPassword && password !== confirmPassword ? "Passwords do not match" : undefined}
            />

            <button
              type="submit"
              disabled={isPending || !usernameValid}
              className="w-full h-12 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Create account"}
            </button>
          </form>

          <OAuthProviders
            onGoogleLogin={() => handleOAuthLogin("google")}
            onGithubLogin={() => handleOAuthLogin("github")}
            hidePasskey // Only show on login for now
            disabled={isPending}
          />

          <p className="text-center mt-6 text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-semibold" style={{ viewTransitionName: 'auth-link' } as any}>
              Log in
            </Link>
          </p>

          <div className="mt-auto pt-6">
            <SecurityIndicators />
          </div>
        </div>
      </div>
    </div>
  );
}
