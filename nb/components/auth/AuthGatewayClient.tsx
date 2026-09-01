"use client";

import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthGatewayClient() {
  const supabase = createSupabaseBrowserClient();

  async function onGoogle() {
    const redirectTo = `${window.location.origin}/auth/callback`;
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  }

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Sign in to continue</p>

      <div className="space-y-3">
        <button onClick={onGoogle} className="w-full rounded-md border px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white dark:bg-zinc-900/10">
          Continue with Google
        </button>
        <div className="text-xs text-zinc-500">or</div>
        <div className="flex items-center justify-center gap-4 text-sm">
          <Link href="/login" className="underline">Sign in with email</Link>
          <span className="text-zinc-500">·</span>
          <Link href="/signup" className="underline">Create an account</Link>
        </div>
      </div>
    </div>
  );
}




























