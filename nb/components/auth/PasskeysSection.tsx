"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui-custom/Button";
import { Loader2, KeyRound, Trash2, CheckCircle2 } from "lucide-react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { readJsonSafe } from "@/lib/api/client";
import type { Passkey as PasskeyType } from "@/lib/types/settingsTypes";

type Passkey = {
  id: string;
  name: string | null;
  created_at: string;
  last_used_at: string | null;
  device_type: string | null;
  backed_up: boolean | null;
};

interface PasskeysSectionProps {
  initialPasskeys?: PasskeyType[];
}

export default function PasskeysSection({ initialPasskeys }: PasskeysSectionProps) {
  const [keys, setKeys] = useState<Passkey[]>(
    initialPasskeys?.map(p => ({
      id: p.id,
      name: p.name,
      created_at: p.created_at,
      last_used_at: p.last_used_at || null,
      device_type: null,
      backed_up: null,
    })) || []
  );
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // IMPORTANT: Don't branch on `window` during render (causes SSR hydration mismatch).
  // We detect support after mount to keep server + first client render identical.
  const [supported, setSupported] = useState<null | boolean>(null);

  useEffect(() => {
    setSupported(!!window.PublicKeyCredential);
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/passkeys", { cache: "no-store" });
      const json = await readJsonSafe(res);
      if (!json?.success) throw new Error(json?.message || "Failed to load passkeys");
      setKeys((json.data?.passkeys || []) as Passkey[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load passkeys");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createPasskey() {
    if (supported !== true) {
      setError("Passkeys are not supported in this browser.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const optRes = await fetch("/api/auth/passkeys/register/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: navigator.platform || "This device" }),
      });
      const optJson = await readJsonSafe(optRes);
      if (!optJson?.success) throw new Error(optJson?.message || "Failed to start passkey setup");

      const attResp = await startRegistration(optJson.data?.options);

      const verifyRes = await fetch("/api/auth/passkeys/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attResp),
      });
      const verifyJson = await readJsonSafe(verifyRes);
      if (!verifyJson?.success) throw new Error(verifyJson?.message || "Failed to save passkey");

      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to create passkey");
    } finally {
      setCreating(false);
    }
  }

  async function verifyWithPasskey() {
    if (supported !== true) {
      setError("Passkeys are not supported in this browser.");
      return;
    }
    if (keys.length === 0) {
      setError("Create a passkey first.");
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const optRes = await fetch("/api/auth/passkeys/authenticate/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const optJson = await readJsonSafe(optRes);
      if (!optJson?.success) throw new Error(optJson?.message || "Failed to start verification");

      const assertion = await startAuthentication(optJson.data?.options);

      const verifyRes = await fetch("/api/auth/passkeys/authenticate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assertion),
      });
      const verifyJson = await readJsonSafe(verifyRes);
      if (!verifyJson?.success) throw new Error(verifyJson?.message || "Verification failed");

      setVerified(true);
      setTimeout(() => setVerified(false), 4000);
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  async function deletePasskey(id: string) {
    if (!confirm("Remove this passkey? You can create a new one any time.")) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/auth/passkeys/${id}`, { method: "DELETE" });
      const json = await readJsonSafe(res);
      if (!json?.success) throw new Error(json?.message || "Failed to remove passkey");
      await refresh();
    } catch (e: any) {
      setError(e?.message || "Failed to remove passkey");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-indigo-600" />
            <h4 className="font-medium">Passkeys</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Use Face ID / Touch ID / Windows Hello to confirm sensitive actions (step‑up verification).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={verifyWithPasskey}
            disabled={supported !== true || verifying || creating || loading || keys.length === 0}
          >
            {verifying ? <Loader2 className="h-3 w-3 animate-spin" /> : verified ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : "Verify"}
          </Button>
          <Button size="sm" onClick={createPasskey} disabled={supported !== true || creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create passkey"}
          </Button>
        </div>
      </div>

      {supported === false ? (
        <div className="text-sm text-muted-foreground">
          Passkeys aren’t supported in this browser/device.
        </div>
      ) : null}

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading passkeys…
        </div>
      ) : keys.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No passkeys yet. Create one to enable biometric confirmations.
        </div>
      ) : (
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-md border p-3">
              <div className="min-w-0">
                <div className="font-medium truncate">{k.name || "Passkey"}</div>
                <div className="text-xs text-muted-foreground">
                  Added {new Date(k.created_at).toLocaleDateString()}
                  {k.last_used_at ? ` • Last used ${new Date(k.last_used_at).toLocaleDateString()}` : ""}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deletePasskey(k.id)} disabled={deletingId === k.id}>
                {deletingId === k.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-500" />}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


