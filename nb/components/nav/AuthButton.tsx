"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthButton() {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function check() {
      const { data } = await supabase.auth.getUser();
      if (mounted) setIsSignedIn(!!data.user);
      setLoading(false);
    }
    check();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(!!session);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);



  async function signOut() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (loading) {
    return <button className="rounded-md border px-3 py-1.5 text-sm opacity-50">Loading...</button>;
  }

  if (isSignedIn) {
    return (
      <button onClick={signOut} className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white dark:bg-zinc-900/10">
        Sign out
      </button>
    );
  }

  return (
    <a href="/auth" className="rounded-md border px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white dark:bg-zinc-900/10">
      Sign in
    </a>
  );
}
