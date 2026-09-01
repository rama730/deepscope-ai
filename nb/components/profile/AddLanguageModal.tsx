"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface AddLanguageModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSave: () => void;
  editingLanguage?: any;
}

export default function AddLanguageModal({
  isOpen,
  onClose,
  userId,
  onSave,
  editingLanguage,
}: AddLanguageModalProps) {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    language: editingLanguage?.language || "",
    proficiency: editingLanguage?.proficiency || "intermediate",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingLanguage) {
        const { error } = await supabase
          .from("user_languages")
          .update(formData)
          .eq("id", editingLanguage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_languages").insert({
          user_id: userId,
          ...formData,
        });
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error saving language:", error);
      alert("Error saving language: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-lg w-full">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {editingLanguage ? "Edit Language" : "Add Language"}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Language *</label>
            <input
              type="text"
              value={formData.language}
              onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              placeholder="e.g., English, Spanish, Mandarin"
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Proficiency *</label>
            <select
              value={formData.proficiency}
              onChange={(e) => setFormData({ ...formData, proficiency: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="elementary">Elementary</option>
              <option value="intermediate">Intermediate</option>
              <option value="professional">Professional Working Proficiency</option>
              <option value="fluent">Fluent</option>
              <option value="native">Native or Bilingual</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Saving..." : editingLanguage ? "Update" : "Add Language"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

























