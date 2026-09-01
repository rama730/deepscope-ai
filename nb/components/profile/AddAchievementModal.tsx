"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface AddAchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSave: () => void;
  editingAchievement?: any;
}

export default function AddAchievementModal({
  isOpen,
  onClose,
  userId,
  onSave,
  editingAchievement,
}: AddAchievementModalProps) {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: editingAchievement?.title || "",
    issuer: editingAchievement?.issuer || "",
    date_received: editingAchievement?.date_received || "",
    description: editingAchievement?.description || "",
    achievement_url: editingAchievement?.achievement_url || "",
    category: editingAchievement?.category || "recognition",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingAchievement) {
        const { error } = await supabase
          .from("achievements")
          .update(formData)
          .eq("id", editingAchievement.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("achievements").insert({
          user_id: userId,
          ...formData,
        });
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error saving achievement:", error);
      alert("Error saving achievement: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-bold">
            {editingAchievement ? "Edit Achievement" : "Add Achievement"}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form id="achievement-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., First Place - Hackathon 2024"
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Issuer/Organization *</label>
            <input
              type="text"
              value={formData.issuer}
              onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
              placeholder="e.g., MIT, Google, TechCrunch"
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="hackathon">Hackathon</option>
              <option value="competition">Competition</option>
              <option value="academic">Academic</option>
              <option value="recognition">Recognition</option>
              <option value="certification">Certification</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Date Received</label>
            <input
              type="date"
              value={formData.date_received}
              onChange={(e) => setFormData({ ...formData, date_received: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Describe your achievement..."
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Certificate/Proof File or URL</label>
            
            {/* File Upload */}
            <div className="mb-3">
              <label className="block w-full cursor-pointer">
                <div className="px-4 py-3 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-center">
                  <svg className="w-8 h-8 mx-auto mb-2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {selectedFile ? (
                    <div className="text-sm font-medium text-blue-600">{selectedFile.name}</div>
                  ) : (
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      Click to upload certificate or proof (PDF, Image)
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              {selectedFile && (
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-sm text-red-600 hover:text-red-700 mt-2"
                >
                  Remove file
                </button>
              )}
            </div>

            {/* OR divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-300 dark:border-zinc-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-zinc-900 text-zinc-500">OR</span>
              </div>
            </div>

            {/* URL Input */}
            <input
              type="url"
              value={formData.achievement_url}
              onChange={(e) => setFormData({ ...formData, achievement_url: e.target.value })}
              placeholder="https://achievement-url.com"
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-zinc-500 mt-1">Upload a file or provide a URL to your achievement</p>
          </div>
        </form>

        {/* Footer - Fixed at bottom */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3 flex-shrink-0 bg-white dark:bg-zinc-900">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
            form="achievement-form"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving..." : editingAchievement ? "Update" : "Add Achievement"}
            </button>
          </div>
      </div>
    </div>
  );
}

