"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import FlowBAuthLayout from "@/components/auth/FlowBAuthLayout";

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const router = useRouter();

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        const res = await fetch("/api/v1/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = await res.json();

        if (cancelled) return;

        if (json?.success) {
          setStatus("success");
          setMessage("Email verified successfully! Redirecting you to the dashboard…");
          setTimeout(() => router.push("/dashboard"), 1500);
        } else {
          setStatus("error");
          setMessage(json?.message || "Verification failed.");
        }
      } catch {
        if (cancelled) return;
        setStatus("error");
        setMessage("An unexpected error occurred.");
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [token, router]);

  const hasError = status === "error";

  return (
    <FlowBAuthLayout
      title={status === "success" ? "Verified!" : status === "error" ? "Verification failed" : "Verifying…"}
      subtitle={message}
      animationHasError={hasError}
    >
      <div className="w-full max-w-[320px]">
        <div className="rounded-xl border px-4 py-4 text-sm text-zinc-700 dark:text-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            {status === "verifying" ? (
              <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            ) : status === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            <div className="min-w-0">
              <div className="font-medium">
                {status === "verifying"
                  ? "Checking your link"
                  : status === "success"
                    ? "Email verified"
                    : "We couldn’t verify your email"}
              </div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">{message}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link href="/login" className="text-indigo-600 hover:underline">
            Go to login
          </Link>
          <Link href="/dashboard" className="text-zinc-600 dark:text-zinc-300 hover:underline">
            Dashboard
          </Link>
        </div>
      </div>
    </FlowBAuthLayout>
  );
}


