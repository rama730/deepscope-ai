"use client";

import { useState, useEffect, Suspense, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import nextDynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import { AuthHeader } from "@/components/auth/AuthHeader";
import { CredentialInput } from "@/components/auth/CredentialInput";
import { OAuthProviders } from "@/components/auth/OAuthProviders";
import { MFAPanel } from "@/components/auth/MFAPanel";
import SecurityIndicators from "@/components/auth/SecurityIndicators";
import { useAuthStore } from "@/stores/useAuthStore";
import { useAuthState } from "@/hooks/useAuthState";
import { loginAction, verifyMfaAction } from "@/app/(auth)/actions";
import { toast } from "sonner";
import { startAuthentication } from "@simplewebauthn/browser";
import { readJsonSafe } from "@/lib/api/client";
// import { useAuth } from "@/hooks/useAuth"; // Unused import removed

// Lazy load animation component for performance
const WorkflowAnimation = nextDynamic(
  () => import("@/components/auth/WorkflowAnimation"),
  {
    loading: () => <div className="animation-skeleton h-[400px] w-full bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl" />,
    ssr: false
  }
);

function LoginPageContent({ initialEmail }: { initialEmail?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const { state, startAuth, setSuccess, setError, setMfa, setNotice, reset } = useAuthState();
  const { rememberedEmail, setRememberedEmail } = useAuthStore();
  // const { reload } = useAuth(); // Unused variable removed

  const [cardActive, setCardActive] = useState(false);
  const [formRevealed, setFormRevealed] = useState(false);

  // Auto-focus and reveal logic
  useEffect(() => {
    const card = document.getElementById("loginCard");
    if (card) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          setCardActive(true);
          setTimeout(() => setFormRevealed(true), 400);
        }, 800);
      });
    }

    const urlError = searchParams.get("error");
    const urlMessage = searchParams.get("message");
    if (urlMessage) setNotice(urlMessage);
    if (urlError) setError(urlError);
  }, [searchParams, setError, setNotice]);

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startAuth("email");

    startTransition(async () => {
      const result = await loginAction(formData);

      if (result.error) {
        setError(result.error);
        toast.error(result.error);
      } else if (result.requiresMFA) {
        setMfa();
      } else if (result.success) {
        setSuccess();
        const rememberMe = formData.get("rememberMe") === "on";
        if (rememberMe) {
          setRememberedEmail(formData.get("identity") as string);
        } else {
          setRememberedEmail(null);
        }

        // Use hard reload for the final redirect to ensure absolute sync across all components (including header)
        toast.success("Login successful!");
        const redirectTo = searchParams.get("redirect") || "/explorer";
        setTimeout(() => {
          window.location.href = redirectTo;
        }, 1000);
      }
    });
  };

  const handleMFAVerify = async (code: string) => {
    startAuth("email"); // Keep loading state
    const result = await verifyMfaAction(code);

    if (result.error) {
      setError(result.error);
      toast.error(result.error);
    } else {
      setSuccess();
      toast.success("MFA verified!");
      const redirectTo = searchParams.get("redirect") || "/explorer";
      setTimeout(() => router.push(redirectTo), 1000);
    }
  };

  const handleOAuthLogin = (provider: "google" | "github") => {
    startAuth(provider);
    const supabase = createSupabaseBrowserClient();
    const redirectTo = `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(
      searchParams.get("redirect") || "/explorer"
    )}`;

    supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    }).catch(err => {
      setError(err.message);
      toast.error(err.message);
    });
  };

  const handlePasskeyLogin = async () => {
    startAuth("passkey");
    try {
      const optRes = await fetch("/api/auth/passkeys/login/options", { method: "POST" });
      const optJson = await readJsonSafe(optRes);
      if (!optJson?.success) throw new Error(optJson?.message || "Passkey login failed");

      const assertion = await startAuthentication(optJson.data.options);

      const verifyRes = await fetch("/api/auth/passkeys/login/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assertion),
      });
      const verifyJson = await readJsonSafe(verifyRes);

      if (verifyJson?.success) {
        setSuccess();
        router.push("/explorer");
      } else {
        throw new Error(verifyJson?.message || "Verification failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Passkey login failed";
      setError(message);
      toast.error(message);
    }
  };

  if (state.status === "mfa") {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="w-full max-w-[400px] bg-white dark:bg-zinc-900 p-8 rounded-3xl shadow-xl border border-zinc-200 dark:border-zinc-800">
          <MFAPanel
            onVerify={handleMFAVerify}
            onCancel={reset}
            loading={isPending}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div
        id="loginCard"
        className={`login-card relative flex w-full max-w-[900px] h-[650px] bg-white dark:bg-zinc-900 rounded-[30px] shadow-2xl overflow-hidden transition-all duration-1000 ${cardActive ? 'opacity-100' : 'opacity-0 scale-95'}`}
        style={{ viewTransitionName: 'auth-card' } as any}
      >

        {/* Left Side: Animation */}
        <div className={`hidden md:flex flex-col w-1/2 bg-zinc-100 dark:bg-zinc-800/50 transition-all duration-1000 ${cardActive ? 'w-1/2' : 'w-full'}`}>
          <Suspense fallback={<div className="w-full h-full animate-pulse bg-zinc-200 dark:bg-zinc-800" />}>
            <WorkflowAnimation />
          </Suspense>
        </div>

        {/* Right Side: Form */}
        <div className={`w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center transition-all duration-500 delay-500 ${formRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <AuthHeader
            subtitle={state.status === "success" ? "Login successful! Redirecting..." : "Experience the future of collaboration"}
          />

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div style={{ viewTransitionName: 'auth-input-email' } as any}>
              <CredentialInput
                id="identity"
                label="Email or @username"
                type="text"
                defaultValue={initialEmail || rememberedEmail || ""}
                placeholder="name@example.com or @username"
                autoComplete="username"
                required
                disabled={isPending}
              />
            </div>
            <div style={{ viewTransitionName: 'auth-input-password' } as any}>
              <CredentialInput
                id="password"
                label="Password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={isPending}
              />
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="rememberMe" defaultChecked={!!(initialEmail || rememberedEmail)} className="rounded border-zinc-300 dark:border-zinc-700" />
                <span>Remember me</span>
              </label>
              <Link href="/forgot-password" title="Forgot your password?" className="text-primary hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full h-12 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Sign in"}
            </button>
          </form>

          <OAuthProviders
            onGoogleLogin={() => handleOAuthLogin("google")}
            onGithubLogin={() => handleOAuthLogin("github")}
            onPasskeyLogin={handlePasskeyLogin}
            disabled={isPending}
          />

          <p className="text-center mt-8 text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline font-semibold" style={{ viewTransitionName: 'auth-link' } as any}>
              Sign up free
            </Link>
          </p>

          <SecurityIndicators />
        </div>
      </div>
    </div>
  );
}

export default function LoginClient({ initialEmail }: { initialEmail?: string }) {
  return <LoginPageContent initialEmail={initialEmail} />;
}
