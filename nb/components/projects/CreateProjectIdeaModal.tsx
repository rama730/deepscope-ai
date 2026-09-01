"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { X, Plus, Loader2, Lightbulb } from "lucide-react";
import Image from "next/image";

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateProjectIdeaModal({ onClose, onSuccess }: Props) {
  const supabase = createSupabaseBrowserClient();
  const [form, setForm] = useState({
    title: "",
    short_description: "",
    problem_statement: "",
    proposed_solution: "",
    long_term_vision: "",
    type: "idea",
    status: "ideation",
    skills_needed: [] as string[],
    roles_needed: [] as Array<{ role_name: string; description: string; count?: number }>,
    tags: [] as string[],
    domain: "",
    tech_stack: [] as string[],
    target_audience: "",
    unique_value_proposition: "",
    video_pitch_url: "",
    media: [] as Array<{ id: string; type: string; url: string; thumbnail_url: string; caption: string }>,
  });

  const [skillInput, setSkillInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [role, setRole] = useState({ role_name: "", description: "", count: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [techInput, setTechInput] = useState("");
  const [uploading, setUploading] = useState(false);

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    setForm((prev) => ({ ...prev, skills_needed: [...prev.skills_needed, s] }));
    setSkillInput("");
  };

  const removeSkill = (s: string) =>
    setForm((prev) => ({ ...prev, skills_needed: prev.skills_needed.filter((x) => x !== s) }));

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    setForm((prev) => ({ ...prev, tags: [...prev.tags, t] }));
    setTagInput("");
  };

  const removeTag = (t: string) =>
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((x) => x !== t) }));

  const addRole = () => {
    if (!role.role_name.trim()) return;
    setForm((prev) => ({ ...prev, roles_needed: [...prev.roles_needed, { ...role, count: role.count || 1 }] }));
    setRole({ role_name: "", description: "", count: 1 });
  };

  const removeRole = (idx: number) =>
    setForm((prev) => ({ ...prev, roles_needed: prev.roles_needed.filter((_, i) => i !== idx) }));

  const addTech = () => {
    const t = techInput.trim();
    if (!t) return;
    setForm((prev) => ({ ...prev, tech_stack: [...prev.tech_stack, t] }));
    setTechInput("");
  };

  const removeTech = (t: string) =>
    setForm((prev) => ({ ...prev, tech_stack: prev.tech_stack.filter((x) => x !== t) }));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please sign in to upload files");
        return;
      }

      const uploads: Array<{ id: string; type: string; url: string; thumbnail_url: string; caption: string }> = [];
      const remainingSlots = 3 - (form.media?.length || 0);

      for (const file of files.slice(0, remainingSlots)) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const filePath = `project-ideas/${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("post-media")
          .upload(filePath, file, { upsert: false });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        const { data: pub } = supabase.storage.from("post-media").getPublicUrl(filePath);
        if (pub?.publicUrl) {
          uploads.push({
            id: `media_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            type: "image",
            url: pub.publicUrl,
            thumbnail_url: pub.publicUrl,
            caption: "",
          });
        }
      }

      setForm((prev) => ({ ...prev, media: [...(prev.media || []), ...uploads] }));
    } catch (err) {
      console.error("Error uploading files:", err);
      alert("Failed to upload files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = (id: string) =>
    setForm((prev) => ({ ...prev, media: (prev.media || []).filter((m) => m.id !== id) }));

  const setMediaCaption = (id: string, caption: string) =>
    setForm((prev) => ({
      ...prev,
      media: (prev.media || []).map((m) => (m.id === id ? { ...m, caption } : m)),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please sign in to create a project idea");
        return;
      }

      // Ensure all roles have a count (default to 1)
      const rolesWithCount = form.roles_needed.map(r => ({
        ...r,
        count: r.count || 1
      }));

      // Insert into project_ideas table
      const { data: ideaData, error: ideaError } = await supabase
        .from("project_ideas")
        .insert({
          title: form.title.trim(),
          short_description: form.short_description.trim(),
          problem_statement: form.problem_statement.trim(),
          proposed_solution: form.proposed_solution.trim(),
          long_term_vision: form.long_term_vision.trim(),
          type: form.type,
          status: form.status,
          skills_needed: form.skills_needed,
          roles_needed: rolesWithCount,
          tags: form.tags,
          domain: form.domain || null,
          tech_stack: form.tech_stack,
          target_audience: form.target_audience.trim() || null,
          unique_value_proposition: form.unique_value_proposition.trim() || null,
          video_pitch_url: form.video_pitch_url.trim() || null,
          media: form.media.length > 0 ? form.media : null,
          creator_id: user.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (ideaError) {
        console.error("Error creating project idea:", ideaError);
        alert("Failed to create project idea. Please try again.");
        return;
      }

      // Create a post in Explorer linked to this idea
      const postContent = `${form.title}\n\n${form.short_description}${form.problem_statement ? `\n\nProblem: ${form.problem_statement}` : ''}${form.proposed_solution ? `\n\nSolution: ${form.proposed_solution}` : ''}`;

      const { error: postError } = await supabase.from("posts").insert({
        content: postContent.trim(),
        user_id: user.id,
        post_type: "project_idea",
        project_idea_id: ideaData.id,
        tags: form.tags.length > 0 ? form.tags : null,
      });

      if (postError) {
        console.error("Error creating post for idea:", postError);
        // Don't fail the whole operation, just log the error
      }

      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Exception creating project idea:", err);
      alert("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                Project Launchpad: Share a New Idea
              </h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                Pitch your idea, gather support, and attract early collaborators.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Core details */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Enter a compelling project title"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Short Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.short_description}
              onChange={(e) => setForm({ ...form, short_description: e.target.value })}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="One-sentence summary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Problem Statement
            </label>
            <textarea
              value={form.problem_statement}
              onChange={(e) => setForm({ ...form, problem_statement: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="What problem does this idea solve?"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Proposed Solution
            </label>
            <textarea
              value={form.proposed_solution}
              onChange={(e) => setForm({ ...form, proposed_solution: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="How will your idea solve this problem?"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Long-term Vision
            </label>
            <textarea
              value={form.long_term_vision}
              onChange={(e) => setForm({ ...form, long_term_vision: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder="What's the long-term vision for this project?"
            />
          </div>

          {/* New fields */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Target Audience
            </label>
            <input
              type="text"
              value={form.target_audience}
              onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
              placeholder="Who benefits from this?"
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Unique Value Proposition
            </label>
            <input
              type="text"
              value={form.unique_value_proposition}
              onChange={(e) => setForm({ ...form, unique_value_proposition: e.target.value })}
              placeholder="What makes it different/better?"
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Categorization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
                Domain
              </label>
              <select
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
              >
                <option value="">Select domain</option>
                <option value="edtech">EdTech</option>
                <option value="fintech">FinTech</option>
                <option value="healthtech">HealthTech</option>
                <option value="social_impact">Social Impact</option>
                <option value="productivity">Productivity</option>
                <option value="gaming">Gaming</option>
                <option value="open_source">Open Source</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
                Type
              </label>
              <select
                className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="idea">Idea</option>
                <option value="challenge">Challenge</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Status
            </label>
            <select
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="ideation">Ideation</option>
              <option value="seeking_feedback">Seeking Feedback</option>
              <option value="seeking_collaborators">Seeking Collaborators</option>
            </select>
          </div>

          {/* Tech stack */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Proposed Tech Stack
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTech();
                  }
                }}
                placeholder="e.g., React, Python, Figma"
                className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addTech}
                className="px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            {form.tech_stack.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tech_stack.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTech(t)}
                      className="hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Media and video pitch */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Visuals (up to 3 images)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleUpload}
                id="idea-media-input"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => document.getElementById("idea-media-input")?.click()}
                disabled={uploading || (form.media || []).length >= 3}
                className="px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload Images"
                )}
              </button>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {(form.media || []).length}/3
              </span>
            </div>
            {(form.media || []).length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                {form.media.map((m) => (
                  <div key={m.id} className="border border-zinc-300 dark:border-zinc-700 rounded-lg overflow-hidden">
                    <Image
                      src={m.url}
                      alt={m.caption || "Idea media"}
                      fill
                      className="object-cover"
                    />
                    <div className="p-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                      <input
                        type="text"
                        placeholder="Caption (optional)"
                        value={m.caption}
                        onChange={(e) => setMediaCaption(m.id, e.target.value)}
                        className="w-full px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => removeMedia(m.id)}
                        className="w-full px-2 py-1 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Video Pitch URL (optional)
            </label>
            <input
              type="url"
              placeholder="https://youtube.com/watch?v=..."
              value={form.video_pitch_url}
              onChange={(e) => setForm({ ...form, video_pitch_url: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Skills Needed */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Skills Needed
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="e.g., React, Figma"
                className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            {form.skills_needed.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.skills_needed.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSkill(s)}
                      className="hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Roles Needed */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Roles Needed
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Role name (e.g., Backend Dev)"
                value={role.role_name}
                onChange={(e) => setRole({ ...role, role_name: e.target.value })}
                className="px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Short description"
                value={role.description}
                onChange={(e) => setRole({ ...role, description: e.target.value })}
                className="px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="number"
                min="1"
                placeholder="Count"
                value={role.count || 1}
                onChange={(e) => setRole({ ...role, count: Math.max(1, parseInt(e.target.value) || 1) })}
                className="px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div className="mt-2">
              <button
                type="button"
                onClick={addRole}
                className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Role
              </button>
            </div>
            {form.roles_needed.length > 0 && (
              <ul className="mt-2 space-y-1">
                {form.roles_needed.map((r, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-zinc-700 dark:text-zinc-300 flex justify-between items-center border border-zinc-300 dark:border-zinc-700 rounded-md px-3 py-2 bg-zinc-50 dark:bg-zinc-800"
                  >
                    <div className="flex-1">
                      <span className="font-medium">{r.role_name}</span>
                      {r.description && (
                        <span className="text-zinc-500 dark:text-zinc-400 ml-2">- {r.description}</span>
                      )}
                      <span className="text-zinc-500 dark:text-zinc-400 ml-2">
                        ({r.count || 1} {r.count === 1 ? 'person' : 'people'} needed)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeRole(idx)}
                      className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-zinc-900 dark:text-white">
              Tags
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="e.g., healthtech, edtech"
                className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2.5 py-1 text-xs border border-zinc-300 dark:border-zinc-700"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="hover:bg-zinc-300 dark:hover:bg-zinc-700 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
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
              Create Idea
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

