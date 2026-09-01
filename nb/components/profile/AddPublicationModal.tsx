"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface AddPublicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSave: () => void;
  editingPublication?: any;
}

export default function AddPublicationModal({
  isOpen,
  onClose,
  userId,
  onSave,
  editingPublication,
}: AddPublicationModalProps) {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: editingPublication?.title || "",
    publisher: editingPublication?.publisher || "",
    publication_date: editingPublication?.publication_date || "",
    description: editingPublication?.description || "",
    publication_url: editingPublication?.publication_url || "",
    type: editingPublication?.type || "article",
  });
  const [authorsInput, setAuthorsInput] = useState(
    editingPublication?.authors?.join(", ") || ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const authors = authorsInput
        .split(",")
        .map((a: string) => a.trim())
        .filter((a: string) => a.length > 0);

      const dataToSave = {
        ...formData,
        authors,
      };

      if (editingPublication) {
        const { error } = await supabase
          .from("publications")
          .update(dataToSave)
          .eq("id", editingPublication.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("publications").insert({
          user_id: userId,
          ...dataToSave,
        });
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error saving publication:", error);
      alert("Error saving publication: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {editingPublication ? "Edit Publication" : "Add Publication"}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Deep Learning for Computer Vision"
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="research">Research Paper</option>
              <option value="article">Article</option>
              <option value="blog">Blog Post</option>
              <option value="patent">Patent</option>
              <option value="book">Book</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Publisher</label>
            <input
              type="text"
              value={formData.publisher}
              onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
              placeholder="e.g., IEEE, Nature, Medium"
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Publication Date</label>
            <input
              type="date"
              value={formData.publication_date}
              onChange={(e) => setFormData({ ...formData, publication_date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Authors (comma-separated)</label>
            <input
              type="text"
              value={authorsInput}
              onChange={(e) => setAuthorsInput(e.target.value)}
              placeholder="e.g., John Doe, Jane Smith, Bob Johnson"
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              placeholder="Brief description or abstract..."
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Publication URL</label>
            <input
              type="url"
              value={formData.publication_url}
              onChange={(e) => setFormData({ ...formData, publication_url: e.target.value })}
              placeholder="https://"
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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
              {loading ? "Saving..." : editingPublication ? "Update" : "Add Publication"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

























