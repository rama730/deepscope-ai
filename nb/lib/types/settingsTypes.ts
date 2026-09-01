/**
 * Settings-related TypeScript types
 */

// ============================================
// Notification Preferences
// ============================================

export interface NotificationPreferences {
  email?: boolean;
  push?: boolean;
  projects?: boolean;
  messages?: boolean;
  mentions?: boolean;
  updates?: boolean;
  marketing?: boolean;
}

// ============================================
// Security Types
// ============================================

export interface MFAFactor {
  id: string;
  factor_type: "totp";
  created_at: string;
  updated_at: string;
  status: "verified" | "unverified";
  friendly_name?: string;
}

export interface Session {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  factor_id?: string;
  aal: "aal1" | "aal2";
  not_after?: string;
  ip?: string;
  user_agent?: string;
}

export interface Passkey {
  id: string;
  name: string;
  created_at: string;
  last_used_at?: string;
  credential_id: string;
}

export interface LoginHistoryEntry {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  success: boolean;
  created_at: string;
  location?: string;
}

export interface SecurityData {
  mfaFactors: MFAFactor[];
  sessions: Session[];
  passkeys: Passkey[];
  loginHistory: LoginHistoryEntry[];
}

// ============================================
// Password Types
// ============================================

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordChangeResponse {
  success: boolean;
  message?: string;
}

// ============================================
// User Data Export
// ============================================

export interface UserDataExport {
  profile: Record<string, unknown>;
  posts: unknown[];
  projects: unknown[];
  connections: unknown[];
  messages: unknown[];
  exportedAt: string;
}

// ============================================
// API Response Wrappers
// ============================================

export interface SettingsApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
