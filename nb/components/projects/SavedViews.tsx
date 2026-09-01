"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  Plus,
  Save,
  Trash2,
  Edit3,
  Check,
  X,
  Star,
  Share2,
  ChevronDown,
  Bookmark,
  Eye,
} from "lucide-react";

interface SavedView {
  id: string;
  name: string;
  description: string | null;
  view_type: string;
  filters: FilterConfig;
  columns: string[];
  sort_by: string | null;
  sort_order: string;
  is_default: boolean;
  is_shared: boolean;
  created_at: string;
}

interface FilterConfig {
  status?: string[];
  priority?: string[];
  assignee?: string[];
  labels?: string[];
  sprint?: string;
  milestone?: string;
  taskType?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  search?: string;
}

interface SavedViewsProps {
  projectId: string;
  viewType: "tasks" | "backlog" | "board" | "timeline" | "calendar";
  currentFilters: FilterConfig;
  onApplyFilters: (filters: FilterConfig) => void;
  onSortChange?: (sortBy: string, sortOrder: "asc" | "desc") => void;
}

const defaultColumns = ["title", "status", "priority", "assignee", "due_date"];

export default function SavedViews({
  projectId,
  viewType,
  currentFilters,
  onApplyFilters,
  onSortChange,
}: SavedViewsProps) {
  const supabase = createSupabaseBrowserClient();
  const [views, setViews] = useState<SavedView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedView, setSelectedView] = useState<SavedView | null>(null);
  const [editingView, setEditingView] = useState<SavedView | null>(null);

  // Load saved views
  const loadViews = useCallback(async () => {
    const { data } = await supabase
      .from("saved_views")
      .select("*")
      .eq("project_id", projectId)
      .eq("view_type", viewType)
      .order("is_default", { ascending: false })
      .order("name");

    if (data) {
      setViews(data);
      // Auto-select default view
      const defaultView = data.find((v) => v.is_default);
      if (defaultView && !selectedView) {
        setSelectedView(defaultView);
        onApplyFilters(defaultView.filters);
      }
    }
    setLoading(false);
  }, [projectId, viewType, supabase, selectedView, onApplyFilters]);

  useEffect(() => {
    loadViews();
  }, [loadViews]);

  // Apply view
  const applyView = (view: SavedView) => {
    setSelectedView(view);
    onApplyFilters(view.filters);
    if (view.sort_by && onSortChange) {
      onSortChange(view.sort_by, view.sort_order as "asc" | "desc");
    }
    setShowDropdown(false);
  };

  // Delete view
  const deleteView = async (viewId: string) => {
    if (!confirm("Delete this saved view?")) return;

    await supabase.from("saved_views").delete().eq("id", viewId);
    setViews((prev) => prev.filter((v) => v.id !== viewId));
    if (selectedView?.id === viewId) {
      setSelectedView(null);
    }
  };

  // Set as default
  const setAsDefault = async (viewId: string) => {
    // Remove default from all views
    await supabase
      .from("saved_views")
      .update({ is_default: false })
      .eq("project_id", projectId)
      .eq("view_type", viewType);

    // Set new default
    await supabase
      .from("saved_views")
      .update({ is_default: true })
      .eq("id", viewId);

    setViews((prev) =>
      prev.map((v) => ({
        ...v,
        is_default: v.id === viewId,
      }))
    );
  };

  // Toggle share
  const toggleShare = async (view: SavedView) => {
    await supabase
      .from("saved_views")
      .update({ is_shared: !view.is_shared })
      .eq("id", view.id);

    setViews((prev) =>
      prev.map((v) =>
        v.id === view.id ? { ...v, is_shared: !v.is_shared } : v
      )
    );
  };

  // Check if current filters differ from selected view
  const hasUnsavedChanges = selectedView
    ? JSON.stringify(currentFilters) !== JSON.stringify(selectedView.filters)
    : Object.keys(currentFilters).length > 0;

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* View Selector */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
          >
            <Eye className="w-4 h-4 text-zinc-500" />
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {selectedView?.name || "All Items"}
            </span>
            {hasUnsavedChanges && (
              <span className="w-2 h-2 rounded-full bg-orange-500" />
            )}
            <ChevronDown className="w-4 h-4 text-zinc-400" />
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute z-20 top-full left-0 mt-1 w-72 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg overflow-hidden"
              >
                {/* Default option */}
                <button
                  onClick={() => {
                    setSelectedView(null);
                    onApplyFilters({});
                    setShowDropdown(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-700 ${
                    !selectedView ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                >
                  <Filter className="w-4 h-4 text-zinc-400" />
                  <span className="text-sm font-medium">All Items (No Filter)</span>
                </button>

                {views.length > 0 && (
                  <div className="border-t border-zinc-200 dark:border-zinc-700">
                    <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                      Saved Views
                    </div>
                    {views.map((view) => (
                      <div
                        key={view.id}
                        className={`group flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-700 ${
                          selectedView?.id === view.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                        }`}
                      >
                        <button
                          onClick={() => applyView(view)}
                          className="flex-1 flex items-center gap-2 text-left"
                        >
                          <Bookmark
                            className={`w-4 h-4 ${
                              view.is_default
                                ? "text-yellow-500 fill-yellow-500"
                                : "text-zinc-400"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                              {view.name}
                            </p>
                            {view.description && (
                              <p className="text-xs text-zinc-500 truncate">
                                {view.description}
                              </p>
                            )}
                          </div>
                          {view.is_shared && (
                            <Share2 className="w-3 h-3 text-zinc-400" />
                          )}
                        </button>

                        {/* Actions */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                          <button
                            onClick={() => setAsDefault(view.id)}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600"
                            title="Set as default"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                view.is_default
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-zinc-400"
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => toggleShare(view)}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600"
                            title={view.is_shared ? "Make private" : "Share with team"}
                          >
                            <Share2
                              className={`w-3.5 h-3.5 ${
                                view.is_shared ? "text-blue-500" : "text-zinc-400"
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => setEditingView(view)}
                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-600"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                          </button>
                          <button
                            onClick={() => deleteView(view.id)}
                            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-zinc-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Create new view */}
                <div className="border-t border-zinc-200 dark:border-zinc-700 p-2">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      setShowSaveModal(true);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  >
                    <Plus className="w-4 h-4" />
                    Save Current View
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Quick save button when there are unsaved changes */}
        {hasUnsavedChanges && selectedView && (
          <button
            onClick={() => setShowSaveModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-medium hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        )}
      </div>

      {/* Save View Modal */}
      <AnimatePresence>
        {(showSaveModal || editingView) && (
          <SaveViewModal
            projectId={projectId}
            viewType={viewType}
            currentFilters={currentFilters}
            existingView={editingView}
            onClose={() => {
              setShowSaveModal(false);
              setEditingView(null);
            }}
            onSave={(view) => {
              if (editingView) {
                setViews((prev) =>
                  prev.map((v) => (v.id === view.id ? view : v))
                );
              } else {
                setViews((prev) => [...prev, view]);
              }
              setSelectedView(view);
              setShowSaveModal(false);
              setEditingView(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Save View Modal
function SaveViewModal({
  projectId,
  viewType,
  currentFilters,
  existingView,
  onClose,
  onSave,
}: {
  projectId: string;
  viewType: string;
  currentFilters: FilterConfig;
  existingView: SavedView | null;
  onClose: () => void;
  onSave: (view: SavedView) => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [name, setName] = useState(existingView?.name || "");
  const [description, setDescription] = useState(existingView?.description || "");
  const [isDefault, setIsDefault] = useState(existingView?.is_default || false);
  const [isShared, setIsShared] = useState(existingView?.is_shared || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in");
      setSaving(false);
      return;
    }

    const viewData = {
      project_id: projectId,
      user_id: user.id,
      name: name.trim(),
      description: description.trim() || null,
      view_type: viewType,
      filters: currentFilters,
      columns: defaultColumns,
      is_default: isDefault,
      is_shared: isShared,
      updated_at: new Date().toISOString(),
    };

    if (existingView) {
      const { data, error } = await supabase
        .from("saved_views")
        .update(viewData)
        .eq("id", existingView.id)
        .select()
        .single();

      if (error) {
        alert("Failed to update view");
        setSaving(false);
        return;
      }

      onSave(data);
    } else {
      const { data, error } = await supabase
        .from("saved_views")
        .insert(viewData)
        .select()
        .single();

      if (error) {
        alert("Failed to save view");
        setSaving(false);
        return;
      }

      onSave(data);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative z-10 w-full max-w-md rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
            {existingView ? "Edit View" : "Save View"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              View Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Tasks, High Priority"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Set as default
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                Share with team
              </span>
            </label>
          </div>

          {/* Show current filters */}
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
            <p className="text-xs font-medium text-zinc-500 mb-2">
              Current Filters
            </p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(currentFilters).map(([key, value]) => {
                if (!value || (Array.isArray(value) && value.length === 0)) return null;
                return (
                  <span
                    key={key}
                    className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs"
                  >
                    {key}: {Array.isArray(value) ? value.join(", ") : String(value)}
                  </span>
                );
              })}
              {Object.keys(currentFilters).length === 0 && (
                <span className="text-xs text-zinc-500">No filters applied</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {existingView ? "Update" : "Save"}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

