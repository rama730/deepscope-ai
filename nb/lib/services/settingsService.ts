/**
 * Centralized Settings Service
 * Encapsulates all settings-related API calls
 */

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  NotificationPreferences,
  PasswordChangeRequest,
  PasswordChangeResponse,
  SecurityData,
  MFAFactor,
  Session,
  LoginHistoryEntry,
  Passkey,
  SettingsApiResponse,
  UserDataExport,
} from "@/lib/types/settingsTypes";

// ============================================
// Notification Preferences
// ============================================

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const res = await fetch("/api/v1/users/me");
  const json = await res.json();
  if (json.success) {
    return json.data.notification_preferences || {};
  }
  throw new Error(json.message || "Failed to fetch notification preferences");
}

export async function updateNotificationPreferences(
  preferences: NotificationPreferences
): Promise<void> {
  const res = await fetch("/api/v1/settings/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(preferences),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message || "Failed to update notification preferences");
  }
}

// ============================================
// Password Management
// ============================================

export async function changePassword(
  request: PasswordChangeRequest
): Promise<PasswordChangeResponse> {
  const res = await fetch("/api/v1/settings/password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const json = await res.json();
  return {
    success: json.success || false,
    message: json.message,
  };
}

// ============================================
// Data Export
// ============================================

export async function exportUserData(): Promise<UserDataExport> {
  const res = await fetch("/api/v1/settings/export-data", { method: "POST" });
  const json = await res.json();
  if (json.success) {
    return json.data;
  }
  throw new Error(json.message || "Failed to export user data");
}

export function downloadUserData(data: UserDataExport): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `user-data-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ============================================
// Account Deletion
// ============================================

export async function deleteAccount(): Promise<SettingsApiResponse<void>> {
  const res = await fetch("/api/v1/users/me", { method: "DELETE" });
  const json = await res.json();
  return {
    success: json.success || false,
    message: json.message,
  };
}

// ============================================
// Security Data (Parallel Fetching)
// ============================================

export async function getMFAFactors(): Promise<MFAFactor[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) {
    console.error("Error fetching MFA factors:", error);
    return [];
  }
  return (data?.all || []).map((f) => ({
    id: f.id,
    factor_type: f.factor_type as "totp",
    created_at: f.created_at,
    updated_at: f.updated_at,
    status: f.status as "verified" | "unverified",
    friendly_name: f.friendly_name,
  }));
}

export async function getSessions(): Promise<Session[]> {
  const supabase = createSupabaseBrowserClient();
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) return [];
  
  // Return current session info
  return [{
    id: sessionData.session.access_token.slice(0, 8),
    user_id: sessionData.session.user.id,
    created_at: new Date(sessionData.session.user.created_at || Date.now()).toISOString(),
    updated_at: new Date().toISOString(),
    aal: (sessionData.session.user.aal || "aal1") as "aal1" | "aal2",
  }];
}

export async function getPasskeys(): Promise<Passkey[]> {
  // Passkeys are typically managed via WebAuthn API
  // This would need to be expanded based on your implementation
  return [];
}

export async function getLoginHistory(): Promise<LoginHistoryEntry[]> {
  const supabase = createSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("login_history")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    // Table might not exist, fail silently
    console.warn("Login history not available:", error.message);
    return [];
  }

  return (data || []).map((entry) => ({
    id: entry.id,
    user_id: entry.user_id,
    ip_address: entry.ip_address || "Unknown",
    user_agent: entry.user_agent || "Unknown",
    success: entry.success ?? true,
    created_at: entry.created_at,
    location: entry.location,
  }));
}

/**
 * Fetch all security data in parallel
 */
export async function getSecurityData(): Promise<SecurityData> {
  const [mfaFactors, sessions, passkeys, loginHistory] = await Promise.all([
    getMFAFactors(),
    getSessions(),
    getPasskeys(),
    getLoginHistory(),
  ]);

  return {
    mfaFactors,
    sessions,
    passkeys,
    loginHistory,
  };
}

// ============================================
// Privacy Settings
// ============================================

export async function getPrivacySettings(): Promise<{ isPrivate: boolean }> {
  const supabase = createSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .select("is_private")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  return { isPrivate: data?.is_private || false };
}

export async function updatePrivacySettings(isPrivate: boolean): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("profiles")
    .update({ is_private: isPrivate })
    .eq("id", user.id);

  if (error) throw error;
}

// ============================================
// Query Keys for React Query
// ============================================

export const settingsKeys = {
  all: ["settings"] as const,
  notifications: () => [...settingsKeys.all, "notifications"] as const,
  security: () => [...settingsKeys.all, "security"] as const,
  privacy: () => [...settingsKeys.all, "privacy"] as const,
  profile: () => [...settingsKeys.all, "profile"] as const,
};
