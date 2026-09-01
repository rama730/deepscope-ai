"use client";

import { useEffect, useState, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProjectSchema, type UpdateProjectInput } from "@/lib/validations/project";
import {
  X,
  Sparkles,
  Globe,
  Lock,
  Layout,
  FileText,
  Layers,
  Users,
  Plus,
  Trash2,
  Check
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui-custom/ConfirmDialog";
import { useToast } from "@/components/ui-custom/Toast";

interface Props {
  project: any;
  onClose: () => void;
  onSaved?: () => void;
  initialTab?: string;
}

// ... Selectors (StatusSelector, VisibilitySelector) can remain or be integrated ...
// I will keep them but integrate into Hook Form via Controller.

function StatusSelector({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const options = [
    { value: "open", label: "Planning", color: "bg-amber-500", desc: "Just getting started" },
    { value: "in-progress", label: "In Progress", color: "bg-blue-500", desc: "Actively building" },
    { value: "completed", label: "Completed", color: "bg-green-500", desc: "Finished & Live" }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`relative p-3 rounded-xl border-2 text-left transition-all ${value === opt.value
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-500"
            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
            }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className={`w-2 h-2 rounded-full ${opt.color} ${value === opt.value ? 'animate-pulse' : ''}`} />
            <span className={`font-semibold text-sm ${value === opt.value ? 'text-blue-700 dark:text-blue-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
              {opt.label}
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{opt.desc}</p>
          {value === opt.value && (
            <div className="absolute top-2 right-2 text-blue-500">
              <Check className="w-4 h-4" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

function VisibilitySelector({ value, onChange }: { value: string, onChange: (val: string) => void }) {
  const options = [
    { value: "public", label: "Public", icon: Globe, desc: "Visible to everyone" },
    { value: "private", label: "Private", icon: Lock, desc: "Only members can see" }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${value === opt.value
              ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 dark:border-indigo-500"
              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900"
              }`}
          >
            <div className={`p-2 rounded-lg ${value === opt.value ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-zinc-100 dark:bg-zinc-800'}`}>
              <Icon className={`w-5 h-5 ${value === opt.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500'}`} />
            </div>
            <div>
              <div className={`font-semibold text-sm ${value === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-zinc-700 dark:text-zinc-300'}`}>
                {opt.label}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{opt.desc}</p>
            </div>
          </button>
        )
      })}
    </div>
  );
}

interface OpenRole {
  id?: string;
  role: string;
  count: number;
  description: string;
  skills: string[];
}

export default function EditProjectModal({ project, onClose, onSaved, initialTab }: Props) {
  const supabase = createSupabaseBrowserClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState(initialTab || "essentials");

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper States (Inputs)
  const [tagInput, setTagInput] = useState("");
  const [techInput, setTechInput] = useState("");
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Roles State (Managed separately for now, could be integrated but complexities exist with nested upserts)
  // For validation, we should integrate update logic properly.
  const [roles, setRoles] = useState<OpenRole[]>([]);
  const [deletedRoleIds, setDeletedRoleIds] = useState<string[]>([]);

  const {
    register, control, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting }
  } = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema) as any,
    defaultValues: {
      title: project?.title || "",
      short_description: project?.short_description || "",
      description: project?.description || "",
      problem_statement: project?.problem_statement || "",
      solution_overview: project?.solution_overview || "",
      status: project?.status || "open",
      visibility: project?.visibility || "public",
      tags: Array.isArray(project?.tags) ? project.tags : [],
      technologies_used: Array.isArray(project?.technologies_used) ? project.technologies_used : [],
      // Metadata mapped separately if needed, schema supports generic metadata
    }
  });

  const tags = watch("tags") || [];
  const techStack = watch("technologies_used") || [];
  const description = watch("description");

  // Load Roles
  useEffect(() => {
    async function fetchRoles() {
      const { data } = await supabase.from("project_open_roles").select("*").eq("project_id", project.id);
      if (data) {
        setRoles(data.map((r: any) => ({
          id: r.id,
          role: r.role || "New Role",
          count: r.count,
          description: r.description || "",
          skills: r.skills || []
        })));
      }
    }
    fetchRoles();
  }, [project.id, supabase]);

  // Auto-grow textarea effect
  useEffect(() => {
    if (descriptionRef.current) {
      descriptionRef.current.style.height = "auto";
      descriptionRef.current.style.height = descriptionRef.current.scrollHeight + "px";
    }
  }, [description]);


  const addTag = () => {
    const clean = tagInput.trim();
    if (clean && !tags.includes(clean)) {
      setValue("tags", [...tags, clean], { shouldDirty: true });
      setTagInput("");
    }
  }

  const removeTag = (tag: string) => {
    setValue("tags", tags.filter(t => t !== tag), { shouldDirty: true });
  }

  const addTech = () => {
    const clean = techInput.trim();
    if (clean && !techStack.includes(clean)) {
      setValue("technologies_used", [...techStack, clean], { shouldDirty: true });
      setTechInput("");
    }
  }

  const removeTech = (tech: string) => {
    setValue("technologies_used", techStack.filter(t => t !== tech), { shouldDirty: true });
  }

  // Role Handlers ...
  function addRole() {
    setRoles([...roles, { role: "New Role", count: 1, description: "", skills: [] }]);
  }
  function updateRole(index: number, field: keyof OpenRole, value: any) {
    const newRoles = [...roles];
    newRoles[index] = { ...newRoles[index], [field]: value } as OpenRole;
    setRoles(newRoles);
  }
  function removeRole(index: number) {
    const role = roles[index];
    if (role && role.id) {
      setDeletedRoleIds([...deletedRoleIds, role.id]);
    }
    setRoles(roles.filter((_, i) => i !== index));
  }

  const onSubmit = async (data: UpdateProjectInput) => {
    try {
      // 1. Update Project
      const res = await fetch(`/api/v1/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw new Error("Failed to update project");

      // 2. Roles Update
      if (deletedRoleIds.length > 0) {
        await supabase.from("project_open_roles").delete().in("id", deletedRoleIds);
      }
      const rolesToUpsert = roles.map(r => ({
        ...(r.id ? { id: r.id } : {}),
        project_id: project.id,
        role: r.role,
        count: r.count,
        description: r.description,
        skills: r.skills
      }));

      if (rolesToUpsert.length > 0) {
        const { error: rolesError } = await supabase.from("project_open_roles").upsert(rolesToUpsert);
        if (rolesError) throw rolesError;
      }

      onSaved?.();
      onClose();
      showToast("Project updated successfully", "success");

    } catch (error) {
      console.error("Update failed", error);
      showToast("Failed to update project", "error");
    }
  };

  const handleDelete = async () => {
    // ... keep existing delete logic ...
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/projects/${project.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Delete failed");

      onClose();
      showToast("Project moved to trash", "success");
      onSaved?.();

    } catch (error) {
      console.error("Delete error:", error);
      showToast("Failed to delete project", "error");
      setIsDeleting(false);
    }
  };

  const tabs = [
    { id: "essentials", label: "Essentials", icon: Layout },
    { id: "details", label: "Details", icon: FileText },
    { id: "stack", label: "Stack & Links", icon: Layers },
    { id: "roles", label: "Team & Roles", icon: Users },
  ];

  return (
    <>
      <AnimatePresence>
        {showDeleteConfirm && (
          <ConfirmDialog
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
            title="Delete Project"
            message={`Are you sure you want to delete "${project.title}"?`}
            confirmText={isDeleting ? "Deleting..." : "Delete Project"}
            type="danger"
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      >
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative z-10 w-full max-w-5xl h-[85vh] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Edit Project</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Make your project stand out</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">
              <X className="w-5 h-5 text-zinc-500" />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col p-4 gap-1 overflow-y-auto hidden md:flex">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                      ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-zinc-200 dark:border-zinc-700"
                      : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800/50"
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                )
              })}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white dark:bg-zinc-900 pb-24 md:pb-24 mt-12 md:mt-0">
              <form id="edit-project-form" onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto space-y-8">

                {/* Tab: Essentials */}
                {activeTab === "essentials" && (
                  <div className="space-y-8">
                    <div className="space-y-6">
                      <Controller
                        control={control}
                        name="status"
                        render={({ field }) => (
                          <div>
                            <label className="block text-sm font-medium mb-3">Priority</label>
                            <StatusSelector value={field.value as string} onChange={field.onChange} />
                          </div>
                        )}
                      />
                      <Controller
                        control={control}
                        name="visibility"
                        render={({ field }) => (
                          <div>
                            <label className="block text-sm font-medium mb-3">Visibility</label>
                            <VisibilitySelector value={field.value as string} onChange={field.onChange} />
                          </div>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Project Title</label>
                        <input {...register("title")} className="w-full px-4 py-3 rounded-lg border dark:bg-zinc-800/50 dark:border-zinc-700" />
                        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1.5">Tagline</label>
                        <input {...register("short_description")} className="w-full px-4 py-3 rounded-lg border dark:bg-zinc-800/50 dark:border-zinc-700" />
                        {errors.short_description && <p className="text-red-500 text-sm mt-1">{errors.short_description.message}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Details */}
                {activeTab === "details" && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Full Description</label>
                      <textarea {...register("description")} ref={descriptionRef} className="w-full px-4 py-3 rounded-lg border dark:bg-zinc-800/50 dark:border-zinc-700 min-h-[150px]" />
                      {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                    </div>
                    <div className="grid gap-6">
                      <div>
                        <label className="block text-sm font-medium mb-2">Problem Statement</label>
                        <textarea {...register("problem_statement")} className="w-full px-4 py-3 rounded-lg border dark:bg-zinc-800/50 dark:border-zinc-700 min-h-[100px]" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Solution Overview</label>
                        <textarea {...register("solution_overview")} className="w-full px-4 py-3 rounded-lg border dark:bg-zinc-800/50 dark:border-zinc-700 min-h-[100px]" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Stack */}
                {activeTab === "stack" && (
                  <div className="space-y-8">
                    <div>
                      <label className="block text-sm font-medium mb-2">Technology Stack</label>
                      <div className="p-4 rounded-xl border dark:border-zinc-700 min-h-[100px]">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {techStack.map((tech, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-700/50 text-sm border">
                              {tech}
                              <button type="button" onClick={() => removeTech(tech)}><X className="w-3 h-3" /></button>
                            </span>
                          ))}
                        </div>
                        <input
                          value={techInput}
                          onChange={e => setTechInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTech(); } }}
                          className="w-full bg-transparent outline-none"
                          placeholder="Type and press Enter..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Tags</label>
                      <div className="p-4 rounded-xl border dark:border-zinc-700 min-h-[80px]">
                        <div className="flex flex-wrap gap-2 mb-3">
                          {tags.map((tag, idx) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm border border-blue-100 dark:border-blue-800">
                              #{tag}
                              <button type="button" onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                            </span>
                          ))}
                        </div>
                        <input
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                          className="w-full bg-transparent outline-none"
                          placeholder="Type and press Enter..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Roles (Manual) */}
                {activeTab === "roles" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">Project Roles</h3>
                      <button type="button" onClick={addRole} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm">
                        <Plus className="w-4 h-4" /> Add Role
                      </button>
                    </div>
                    <div className="grid gap-4">
                      {roles.map((role, idx) => (
                        <div key={idx} className="p-4 rounded-xl border dark:border-zinc-700 space-y-4">
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <label className="text-xs font-semibold">Role</label>
                              <input value={role.role} onChange={e => updateRole(idx, 'role', e.target.value)} className="w-full px-3 py-2 rounded-lg border dark:bg-zinc-800/50 dark:border-zinc-700" />
                            </div>
                            <div className="w-24">
                              <label className="text-xs font-semibold">Count</label>
                              <input type="number" value={role.count} onChange={e => updateRole(idx, 'count', parseInt(e.target.value))} className="w-full px-3 py-2 rounded-lg border dark:bg-zinc-800/50 dark:border-zinc-700" />
                            </div>
                            <button type="button" onClick={() => removeRole(idx)} className="self-end p-2 text-red-500"><Trash2 className="w-5 h-5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </form>
            </div>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-end gap-3 z-20">
              <button type="button" onClick={handleDelete} className="mr-auto text-red-500 text-sm font-medium">Delete Project</button>
              <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border dark:border-zinc-700">Cancel</button>
              <button type="submit" form="edit-project-form" disabled={isSubmitting} className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white shadow-lg disabled:opacity-50">
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
