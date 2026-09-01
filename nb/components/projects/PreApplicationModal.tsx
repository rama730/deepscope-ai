"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { X, UserPlus, Loader2 } from "lucide-react";

interface Props {
  ideaId: string;
  idea: any;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PreApplicationModal({ ideaId, idea, onClose, onSuccess }: Props) {
  const supabase = createSupabaseBrowserClient();
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const rolesNeeded = (idea?.roles_needed || []) as Array<{ role_name: string; description: string }>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please sign in to apply");
        return;
      }

      // Check if user already applied
      const { data: existingApp } = await supabase
        .from("project_idea_pre_applications")
        .select("id")
        .eq("idea_id", ideaId)
        .eq("user_id", user.id)
        .single();

      if (existingApp) {
        alert("You have already applied to this idea.");
        return;
      }

      // Check if user is the creator
      if (idea.creator_id === user.id) {
        alert("You cannot apply to your own idea.");
        return;
      }

      const { error } = await supabase.from("project_idea_pre_applications").insert({
        idea_id: ideaId,
        user_id: user.id,
        role_name: selectedRole || null,
        message: message.trim() || null,
        status: "pending",
      });

      if (error) {
        console.error("Error submitting pre-application:", error);
        alert("Failed to submit application. Please try again.");
        return;
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Exception submitting pre-application:", err);
      alert("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full shadow-xl">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-600" />
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Pre-Apply to Idea
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Select Role (Optional)
            </label>
            {rolesNeeded.length > 0 ? (
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">No specific role</option>
                {rolesNeeded.map((role, idx) => (
                  <option key={idx} value={role.role_name}>
                    {role.role_name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No specific roles defined for this idea.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Tell the creator why you're interested in this idea..."
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Application
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

