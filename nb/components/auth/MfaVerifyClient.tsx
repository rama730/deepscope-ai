"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, AlertTriangle } from "lucide-react";
import FlowBAuthLayout from "@/components/auth/FlowBAuthLayout";

export default function MfaVerifyClient() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [challengeData, setChallengeData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function initChallenge() {
      setLoading(true);
      try {
        const res = await fetch("/api/v1/auth/mfa/challenge", { method: "POST" });
        const json = await res.json();
        if (cancelled) return;
        if (json?.success) {
          setChallengeData(json.data);
        } else {
          setError("Could not initialize MFA. Please try logging in again.");
        }
      } catch {
        if (cancelled) return;
        setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    initChallenge();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeData) return;

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/v1/auth/mfa/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factorId: challengeData.factorId,
          challengeId: challengeData.challengeId,
          code,
        }),
      });
      const json = await res.json();
      if (json?.success) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(json?.message || "Invalid code");
      }
    } catch {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FlowBAuthLayout
      title="Two‑factor verification"
      subtitle="Enter the 6‑digit code from your authenticator app."
      animationBlurred
      animationHasError={!!error}
    >
      <form onSubmit={handleVerify} className="w-full max-w-[320px] space-y-4">
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="mfaCode" className="block text-sm text-zinc-600 dark:text-zinc-300">
            Authentication code
          </label>
          <div className="relative">
            <input
              id="mfaCode"
              name="one-time-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="000000"
              maxLength={6}
              className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 pr-10 text-base text-zinc-900 outline-none transition focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              disabled={loading}
              autoFocus
            />
            <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !challengeData || code.length !== 6}
          className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition disabled:opacity-60 dark:bg-indigo-600"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying…
            </span>
          ) : (
            "Verify"
          )}
        </button>
      </form>
    </FlowBAuthLayout>
  );
}


