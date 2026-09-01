"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface TaskTemplatesProps {
  projectId: string;
  onTasksCreated: () => void;
}

const TEMPLATES = [
  {
    id: "sprint_planning",
    name: "Sprint Planning",
    icon: "🏃",
    description: "Standard sprint planning tasks",
    tasks: [
      { title: "Review previous sprint", priority: "high", description: "Analyze completed work and blockers" },
      { title: "Estimate story points", priority: "high", description: "Assign effort estimates to backlog items" },
      { title: "Sprint goal definition", priority: "high", description: "Define clear sprint objectives" },
      { title: "Task breakdown", priority: "medium", description: "Break down stories into actionable tasks" },
      { title: "Capacity planning", priority: "medium", description: "Allocate resources and time" },
    ],
  },
  {
    id: "product_launch",
    name: "Product Launch",
    icon: "🚀",
    description: "Product launch checklist",
    tasks: [
      { title: "Final QA testing", priority: "high", description: "Complete comprehensive testing" },
      { title: "Marketing materials", priority: "high", description: "Prepare launch announcements" },
      { title: "Documentation update", priority: "medium", description: "Update user guides and FAQs" },
      { title: "Monitoring setup", priority: "high", description: "Configure alerts and dashboards" },
      { title: "Post-launch review", priority: "low", description: "Schedule retrospective meeting" },
    ],
  },
  {
    id: "bug_fix_workflow",
    name: "Bug Fix Workflow",
    icon: "🐛",
    description: "Standard bug resolution process",
    tasks: [
      { title: "Reproduce bug", priority: "high", description: "Verify bug exists and document steps" },
      { title: "Root cause analysis", priority: "high", description: "Identify underlying issue" },
      { title: "Implement fix", priority: "high", description: "Code and test solution" },
      { title: "Regression testing", priority: "medium", description: "Ensure no new issues introduced" },
      { title: "Deploy to production", priority: "medium", description: "Release fix to users" },
    ],
  },
  {
    id: "onboarding",
    name: "Team Onboarding",
    icon: "👋",
    description: "New team member onboarding",
    tasks: [
      { title: "Setup development environment", priority: "high", description: "Install tools and dependencies" },
      { title: "Code repository access", priority: "high", description: "Grant necessary permissions" },
      { title: "Documentation review", priority: "medium", description: "Read project docs and architecture" },
      { title: "Meet the team", priority: "medium", description: "Introduction meetings with team members" },
      { title: "First task assignment", priority: "low", description: "Assign beginner-friendly task" },
    ],
  },
  {
    id: "content_creation",
    name: "Content Creation",
    icon: "✍️",
    description: "Content development workflow",
    tasks: [
      { title: "Topic research", priority: "high", description: "Research and outline content ideas" },
      { title: "Draft content", priority: "high", description: "Write initial draft" },
      { title: "Review and edit", priority: "medium", description: "Proofread and improve quality" },
      { title: "Design assets", priority: "medium", description: "Create supporting visuals" },
      { title: "Publish and promote", priority: "low", description: "Release content and share" },
    ],
  },
  {
    id: "security_audit",
    name: "Security Audit",
    icon: "🔒",
    description: "Security review checklist",
    tasks: [
      { title: "Dependency scan", priority: "high", description: "Check for vulnerable packages" },
      { title: "Code review", priority: "high", description: "Review for security vulnerabilities" },
      { title: "Penetration testing", priority: "high", description: "Test for security weaknesses" },
      { title: "Update security docs", priority: "medium", description: "Document security policies" },
      { title: "Team training", priority: "low", description: "Security best practices workshop" },
    ],
  },
];

export default function TaskTemplates({ projectId, onTasksCreated }: TaskTemplatesProps) {
  const supabase = createSupabaseBrowserClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handleCreateFromTemplate(templateId: string) {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template || creating) return;

    setCreating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in");
        setCreating(false);
        return;
      }

      const tasksToCreate = template.tasks.map(task => ({
        project_id: projectId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: "todo" as const,
        created_by: user.id,
      }));

      const { error } = await supabase
        .from("project_tasks")
        .insert(tasksToCreate);

      if (error) {
        console.error("Error creating tasks:", error);
        alert("Failed to create tasks from template");
      } else {
        onTasksCreated();
        setSelectedTemplate(null);
      }
    } catch (err) {
      console.error("Exception:", err);
      alert("An error occurred");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold text-lg mb-2">Task Templates</h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Quick-start your project with pre-built task templates
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TEMPLATES.map(template => (
          <div
            key={template.id}
            className={`group rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-lg ${
              selectedTemplate === template.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md"
                : "border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700"
            }`}
            onClick={() => setSelectedTemplate(template.id)}
          >
            <div className="text-3xl mb-2">{template.icon}</div>
            <h4 className="font-bold text-sm mb-1">{template.name}</h4>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
              {template.description}
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">{template.tasks.length} tasks</span>
              {selectedTemplate === template.id && (
                <span className="text-blue-600 dark:text-blue-400 font-semibold">Selected ✓</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedTemplate && (
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 p-5">
          <div className="mb-4">
            <h4 className="font-bold mb-2">
              {TEMPLATES.find(t => t.id === selectedTemplate)?.name} Template
            </h4>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
              The following {TEMPLATES.find(t => t.id === selectedTemplate)?.tasks.length} tasks will be created:
            </p>
            <ul className="space-y-2">
              {TEMPLATES.find(t => t.id === selectedTemplate)?.tasks.map((task, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    task.priority === "high"
                      ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                      : task.priority === "medium"
                      ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                  }`}>
                    {task.priority}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">{task.title}</p>
                    <p className="text-xs text-zinc-500">{task.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTemplate(null)}
              disabled={creating}
              className="flex-1 px-4 py-2 rounded-lg border-2 border-zinc-200 dark:border-zinc-700 font-semibold hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={() => handleCreateFromTemplate(selectedTemplate)}
              disabled={creating}
              className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {creating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating...
                </>
              ) : (
                <>
                  Create Tasks
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


