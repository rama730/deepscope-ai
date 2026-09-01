"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui-custom/Toast";
import Image from "next/image";

interface PrivacySettingsProps {
  userId: string;
  currentProfile: any;
  onUpdate: () => void;
}

export default function PrivacySettings({ userId, currentProfile, onUpdate }: PrivacySettingsProps) {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [settings, setSettings] = useState({
    profile_visibility: "public",
    email_visibility: "connections",
    show_activity_status: true,
    profile_theme: "default",
  });

  useEffect(() => {
    if (currentProfile) {
      setSettings({
        profile_visibility: currentProfile.profile_visibility || "public",
        email_visibility: currentProfile.email_visibility || "connections",
        show_activity_status: currentProfile.show_activity_status !== false,
        profile_theme: currentProfile.profile_theme || "default",
      });
    }
    loadBlockedUsers();
  }, [currentProfile, userId]);

  async function loadBlockedUsers() {
    setLoadingBlocks(true);
    try {
      const { data, error } = await supabase
        .from("blocks")
        .select(`
          blocked_id,
          profiles:blocked_id (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq("blocker_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBlockedUsers(data || []);
    } catch (error: any) {
      console.error("Error loading blocked users:", error);
    } finally {
      setLoadingBlocks(false);
    }
  }

  async function handleExportData() {
    setExporting(true);
    try {
      // Fetch all user data
      const [
        { data: profileData },
        { data: postsData },
        { data: projectsData },
        { data: connectionsData },
        { data: skillsData },
        { data: experiencesData },
        { data: educationData },
        { data: certificationsData },
        { data: achievementsData },
        { data: publicationsData },
        { data: languagesData },
        { data: volunteeringData },
        { data: bookmarksData },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).single(),
        supabase.from("posts").select("*").eq("user_id", userId),
        supabase.from("projects").select("*").eq("creator_id", userId),
        supabase.from("connections").select("*").or(`user_id.eq.${userId},connected_user_id.eq.${userId}`),
        supabase.from("skills").select("*").eq("user_id", userId),
        supabase.from("experiences").select("*").eq("user_id", userId),
        supabase.from("education").select("*").eq("user_id", userId),
        supabase.from("certifications").select("*").eq("user_id", userId),
        supabase.from("achievements").select("*").eq("user_id", userId),
        supabase.from("publications").select("*").eq("user_id", userId),
        supabase.from("languages").select("*").eq("user_id", userId),
        supabase.from("volunteering").select("*").eq("user_id", userId),
        supabase.from("bookmarks").select("*").eq("user_id", userId),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        profile: profileData,
        posts: postsData || [],
        projects: projectsData || [],
        connections: connectionsData || [],
        skills: skillsData || [],
        experiences: experiencesData || [],
        education: educationData || [],
        certifications: certificationsData || [],
        achievements: achievementsData || [],
        publications: publicationsData || [],
        languages: languagesData || [],
        volunteering: volunteeringData || [],
        bookmarks: bookmarksData || [],
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user_data_export_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      showToast("Data exported successfully!", "success");
    } catch (error: any) {
      console.error("Error exporting data:", error);
      showToast("Error exporting data: " + error.message, "error");
    } finally {
      setExporting(false);
    }
  }

  async function handleRequestAccountDeletion() {
    setShowDeleteConfirm(true);
  }

  async function confirmAccountDeletion() {
    if (deleteConfirmation !== "DELETE") {
      showToast("Please type DELETE to confirm", "warning");
      return;
    }

    if (!confirm("Are you absolutely sure? This action cannot be undone.")) {
      return;
    }

    setDeleting(true);
    try {
      // Delete all user data (cascade should handle most, but we'll be explicit)
      await supabase.from("profiles").delete().eq("id", userId);

      // Sign out and redirect
      await supabase.auth.signOut();
      showToast("Account deleted. You will be signed out.", "info");
      router.push("/");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      showToast("Error deleting account: " + error.message, "error");
      setDeleting(false);
    }
  }

  async function handleUnblockUser(blockedUserId: string) {
    try {
      const { error } = await supabase
        .from("blocks")
        .delete()
        .eq("blocker_id", userId)
        .eq("blocked_id", blockedUserId);

      if (error) throw error;
      loadBlockedUsers();
      showToast("User unblocked successfully", "success");
    } catch (error: any) {
      console.error("Error unblocking user:", error);
      showToast("Error unblocking user: " + error.message, "error");
    }
  }

  async function handleSave() {
    setLoading(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update(settings)
        .eq("id", userId);

      if (error) throw error;

      showToast("Privacy settings updated successfully!", "success");
      onUpdate();
    } catch (error: any) {
      console.error("Error updating privacy settings:", error);
      showToast("Error updating settings: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-white dark:bg-zinc-900 border p-6">
        <h2 className="text-2xl font-bold mb-6">Privacy & Settings</h2>

        {/* Profile Visibility */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Profile Visibility
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
            Control who can see your full profile
          </p>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">
              <input
                type="radio"
                name="profile_visibility"
                value="public"
                checked={settings.profile_visibility === "public"}
                onChange={(e) => setSettings({ ...settings, profile_visibility: e.target.value })}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium">Public</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Anyone can view your profile, even without signing in
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">
              <input
                type="radio"
                name="profile_visibility"
                value="connections"
                checked={settings.profile_visibility === "connections"}
                onChange={(e) => setSettings({ ...settings, profile_visibility: e.target.value })}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium">Connections Only</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Only your connections can view your full profile
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">
              <input
                type="radio"
                name="profile_visibility"
                value="private"
                checked={settings.profile_visibility === "private"}
                onChange={(e) => setSettings({ ...settings, profile_visibility: e.target.value })}
                className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="font-medium">Private</div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Only you can view your profile
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Email Visibility */}
        <div className="mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email Visibility
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
            Choose who can see your email address
          </p>
          <select
            value={settings.email_visibility}
            onChange={(e) => setSettings({ ...settings, email_visibility: e.target.value })}
            className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="public">Everyone</option>
            <option value="connections">Connections Only</option>
            <option value="private">Only Me</option>
          </select>
        </div>

        {/* Activity Status */}
        <div className="mb-6 pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Activity Status
          </h3>
          <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">
            <input
              type="checkbox"
              checked={settings.show_activity_status}
              onChange={(e) => setSettings({ ...settings, show_activity_status: e.target.checked })}
              className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="font-medium">Show when I'm active</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                Let others know when you're online and active
              </div>
            </div>
          </label>
        </div>

        {/* Profile Theme */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Profile Theme
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
            Customize your profile appearance
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: "default", label: "Default", gradient: "from-blue-500 to-purple-500" },
              { value: "ocean", label: "Ocean", gradient: "from-cyan-500 to-blue-500" },
              { value: "sunset", label: "Sunset", gradient: "from-orange-500 to-pink-500" },
              { value: "forest", label: "Forest", gradient: "from-green-500 to-teal-500" },
            ].map((theme) => (
              <button
                key={theme.value}
                onClick={() => setSettings({ ...settings, profile_theme: theme.value })}
                className={`p-4 border-2 rounded-lg text-center transition-all ${settings.profile_theme === theme.value
                  ? "border-blue-600 ring-2 ring-blue-200 dark:ring-blue-900"
                  : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400"
                  }`}
              >
                <div className={`h-12 rounded mb-2 bg-gradient-to-r ${theme.gradient}`} />
                <div className="text-sm font-medium">{theme.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-semibold"
          >
            {loading ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="rounded-xl bg-white dark:bg-zinc-900 border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Data Management
        </h3>

        <div className="space-y-3">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
            <h4 className="font-medium mb-2">Export Your Data</h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              Download all your profile data in JSON format
            </p>
            <button
              onClick={handleExportData}
              disabled={exporting}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? "Exporting..." : "Download Data →"}
            </button>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <h4 className="font-medium text-red-900 dark:text-red-200 mb-2">Delete Account</h4>
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <button
              onClick={handleRequestAccountDeletion}
              disabled={deleting}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "Deleting..." : "Request Account Deletion"}
            </button>
          </div>
        </div>
      </div>

      {/* Blocked Users */}
      <div className="rounded-xl bg-white dark:bg-zinc-900 border p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Blocked Users
        </h3>
        {loadingBlocks ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading...</p>
        ) : blockedUsers.length === 0 ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            You haven't blocked anyone yet.
          </p>
        ) : (
          <div className="space-y-3">
            {blockedUsers.map((block) => {
              const user = block.profiles;
              if (!user) return null;
              return (
                <div
                  key={block.blocked_id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {user.avatar_url ? (
                      <Image
                        src={user.avatar_url}
                        alt={user.full_name || user.username || "User"}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                        {(user.full_name || user.username || "U")[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{user.full_name || user.username || "Unknown User"}</div>
                      {user.username && user.full_name && (
                        <div className="text-sm text-zinc-500">@{user.username}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblockUser(block.blocked_id)}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                    aria-label={`Unblock ${user.full_name || user.username || "user"}`}
                  >
                    Unblock
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4 text-red-600 dark:text-red-400">Delete Account</h3>

            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">Warning: This action cannot be undone!</p>
              <p className="text-sm text-red-700 dark:text-red-300">
                This will permanently delete your account and all associated data including posts, projects, connections, and profile information.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Type <span className="font-mono font-bold">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmation("");
                }}
                className="px-4 py-2 rounded-lg border hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={confirmAccountDeletion}
                disabled={deleteConfirmation !== "DELETE" || deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



















