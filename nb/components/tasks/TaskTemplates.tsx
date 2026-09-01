"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { FileText, Plus, X, Globe } from "lucide-react";
import { useToast } from "@/components/ui-custom/Toast";

interface TaskTemplate {
  id: string;
  name: string;
  description: string | null;
  title: string;
  task_description: string | null;
  priority: string;
  estimated_hours: number | null;
  tags: string[];
  is_global: boolean;
  project_id: string | null;
}

interface TaskTemplatesProps {
  projectId: string;
  onSelectTemplate: (template: TaskTemplate) => void;
}

export default function TaskTemplates({ projectId, onSelectTemplate }: TaskTemplatesProps) {
  const supabase = createSupabaseBrowserClient();
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    title: "",
    task_description: "",
    priority: "medium",
    estimated_hours: "",
    tags: [] as string[],
    is_global: false,
  });

  useEffect(() => {
    loadTemplates();
  }, [projectId]);

  async function loadTemplates() {
    setLoading(true);
    try {
      // Load global templates and project-specific templates
      const { data, error } = await supabase
        .from("task_templates")
        .select("id, name, description, title, task_description, priority, estimated_hours, tags, is_global, project_id")
        .or(`is_global.eq.true,project_id.eq.${projectId}`)
        .order("is_global", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTemplates((data || []) as TaskTemplate[]);
    } catch (err: any) {
      const code = err?.code;
      const message = err?.message || err?.details || "Unknown error";
      console.error("Error loading templates:", {
        code,
        message,
        details: err?.details,
        hint: err?.hint,
        raw: err,
      });

      if (code === "42P01") {
        showToast("Task templates table is missing. Run latest Supabase migrations.", "error");
      } else if (code === "42501") {
        showToast("Permission denied loading task templates (RLS).", "error");
      } else {
        showToast("Failed to load templates", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  async function createTemplate() {
    if (!newTemplate.name || !newTemplate.title) {
      showToast("Name and title are required", "warning");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("task_templates")
        .insert({
          name: newTemplate.name,
          description: newTemplate.description || null,
          title: newTemplate.title,
          task_description: newTemplate.task_description || null,
          priority: newTemplate.priority,
          estimated_hours: newTemplate.estimated_hours ? parseFloat(newTemplate.estimated_hours) : null,
          tags: newTemplate.tags,
          is_global: newTemplate.is_global,
          project_id: newTemplate.is_global ? null : projectId,
          created_by: user.id,
        });

      if (error) throw error;

      showToast("Template created successfully", "success");
      setShowCreateModal(false);
      setNewTemplate({
        name: "",
        description: "",
        title: "",
        task_description: "",
        priority: "medium",
        estimated_hours: "",
        tags: [],
        is_global: false,
      });
      loadTemplates();
    } catch (err: any) {
      console.error("Error creating template:", err);
      showToast("Failed to create template: " + err.message, "error");
    }
  }

  async function deleteTemplate(templateId: string) {
    if (!confirm("Delete this template?")) return;

    try {
      const { error } = await supabase
        .from("task_templates")
        .delete()
        .eq("id", templateId);

      if (error) throw error;

      showToast("Template deleted", "success");
      loadTemplates();
    } catch (err: any) {
      console.error("Error deleting template:", err);
      showToast("Failed to delete template", "error");
    }
  }

  if (loading) {
    return <div className="text-center py-8 text-zinc-500">Loading templates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Task Templates</h3>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
          <p>No templates available</p>
          <p className="text-sm mt-1">Create a template to quickly add similar tasks</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map(template => (
            <div
              key={template.id}
              className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => onSelectTemplate(template)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">{template.name}</h4>
                </div>
                <div className="flex items-center gap-1">
                  {template.is_global && (
                    <span title="Global template">
                      <Globe className="w-4 h-4 text-blue-500" />
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTemplate(template.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
              {template.description && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">{template.description}</p>
              )}
              <div className="space-y-1 text-xs text-zinc-500">
                <p><span className="font-medium">Task:</span> {template.title}</p>
                <p><span className="font-medium">Priority:</span> {template.priority}</p>
                {template.estimated_hours && (
                  <p><span className="font-medium">Estimate:</span> {template.estimated_hours}h</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => {
            // Only close if clicking the backdrop, not the modal content
            if (e.target === e.currentTarget) {
              e.stopPropagation();
              setShowCreateModal(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setShowCreateModal(false);
            }
          }}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Create Task Template</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Template Name *</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="e.g., Bug Fix Template"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <input
                  type="text"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Template description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Task Title *</label>
                <input
                  type="text"
                  value={newTemplate.title}
                  onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Default task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Task Description</label>
                <textarea
                  value={newTemplate.task_description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, task_description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                  placeholder="Default task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={newTemplate.priority}
                    onChange={(e) => setNewTemplate({ ...newTemplate, priority: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    value={newTemplate.estimated_hours}
                    onChange={(e) => setNewTemplate({ ...newTemplate, estimated_hours: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newTemplate.is_global}
                    onChange={(e) => setNewTemplate({ ...newTemplate, is_global: e.target.checked })}
                  />
                  <span className="text-sm">Make this a global template (available to all projects)</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCreateModal(false);
                }}
                className="px-4 py-2 border rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  createTemplate();
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

