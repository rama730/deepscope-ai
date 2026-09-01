"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface AddCertificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSave: () => void;
  editingCertification?: any;
}

export default function AddCertificationModal({
  isOpen,
  onClose,
  userId,
  onSave,
  editingCertification,
}: AddCertificationModalProps) {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: editingCertification?.name || "",
    issuing_org: editingCertification?.issuing_org || "",
    issue_date: editingCertification?.issue_date || "",
    credential_url: editingCertification?.credential_url || "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingCertification) {
        const { error } = await supabase
          .from("certifications")
          .update(formData)
          .eq("id", editingCertification.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("certifications").insert({
          user_id: userId,
          ...formData,
        });
        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error saving certification:", error);
      alert("Error saving certification: " + error.message);
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
            {editingCertification ? "Edit Certification" : "Add Certification"}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Certification Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., AWS Certified Solutions Architect"
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Issuing Organization *</label>
            <input
              type="text"
              value={formData.issuing_org}
              onChange={(e) => setFormData({ ...formData, issuing_org: e.target.value })}
              placeholder="e.g., Amazon Web Services"
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Issue Date</label>
            <input
              type="date"
              value={formData.issue_date}
              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Credential File or URL</label>
            
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
                      Click to upload certificate (PDF, Image)
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
              value={formData.credential_url}
              onChange={(e) => setFormData({ ...formData, credential_url: e.target.value })}
              placeholder="https://credential-url.com"
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-zinc-500 mt-1">Upload a file or provide a URL to your credential</p>
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
              {loading ? "Saving..." : editingCertification ? "Update" : "Add Certification"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

