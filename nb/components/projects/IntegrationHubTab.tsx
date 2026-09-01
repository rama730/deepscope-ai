"use client";

import { useEffect, useState, useCallback } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import { toast } from "sonner";

interface IntegrationHubTabProps {
  projectId: string;
  isProjectOwner: boolean;
}

export default function IntegrationHubTab({ projectId, isProjectOwner }: IntegrationHubTabProps) {
  const supabase = createSupabaseBrowserClient();
  const [githubConnected, setGithubConnected] = useState(false);
  const [slackConnected] = useState(false);
  const [githubRepo, setGithubRepo] = useState("");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [saving, setSaving] = useState(false);

  const loadIntegrations = useCallback(async () => {
    const { data: project } = await supabase
      .from("projects")
      .select("github_repository")
      .eq("id", projectId)
      .single();

    if (project) {
      setGithubRepo(project.github_repository || "");
      setGithubConnected(!!project.github_repository);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    if (projectId) {
      loadIntegrations();
    }
  }, [projectId, loadIntegrations]);

  async function handleGithubConnect() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ github_repository: githubRepo || null })
        .eq("id", projectId);

      if (error) {
        logger.error("Error updating GitHub repository", { error });
        toast.error("Failed to update GitHub repository");
      } else {
        setGithubConnected(!!githubRepo);
        toast.success("GitHub repository updated");
      }
    } catch (err) {
      logger.error("Exception updating GitHub repository", { error: err });
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleSlackConnect() {
    setSaving(true);
    try {
      // TODO: Store webhook URL in project settings or integrations table
      toast.info("Slack integration coming soon!");
    } catch (err) {
      logger.error("Exception in Slack connect", { error: err });
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (!isProjectOwner) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-zinc-700 dark:text-zinc-300 mb-2">Access Restricted</h3>
        <p className="text-sm text-zinc-500">Only project owners can manage integrations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Integrations</h3>
        <p className="text-sm text-zinc-500 mb-6">Connect your project with external tools and services</p>
      </div>

      {/* GitHub Integration */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-white dark:text-zinc-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">GitHub</h4>
              <p className="text-sm text-zinc-500">Link your GitHub repository</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${githubConnected
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
            }`}>
            {githubConnected ? "Connected" : "Not Connected"}
          </span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Repository URL
            </label>
            <input
              type="url"
              value={githubRepo}
              onChange={e => setGithubRepo(e.target.value)}
              className="w-full px-4 py-2.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors text-sm"
              placeholder="https://github.com/username/repo"
            />
          </div>
          <button
            onClick={handleGithubConnect}
            disabled={saving}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : githubConnected ? "Update Repository" : "Connect Repository"}
          </button>
        </div>
      </div>

      {/* Slack Integration */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.523 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.523 2.522 2.528 2.528 0 0 1-2.523 2.52zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.523h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.522 2.527 2.527 0 0 1-2.52-2.522V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.521A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522 2.527 2.527 0 0 1 2.52-2.522zM5.042 8.834a2.528 2.528 0 0 1 2.522-2.523A2.528 2.528 0 0 1 10.085 8.834H2.522A2.528 2.528 0 0 1 0 6.312a2.528 2.528 0 0 1 2.522-2.522h2.52v2.522z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">Slack</h4>
              <p className="text-sm text-zinc-500">Get notifications in your Slack channel</p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${slackConnected
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
            }`}>
            {slackConnected ? "Connected" : "Not Connected"}
          </span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Webhook URL
            </label>
            <input
              type="url"
              value={slackWebhook}
              onChange={e => setSlackWebhook(e.target.value)}
              className="w-full px-4 py-2.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors text-sm"
              placeholder="https://hooks.slack.com/services/..."
            />
          </div>
          <button
            onClick={handleSlackConnect}
            disabled={saving}
            className="px-4 py-2 rounded-md bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : slackConnected ? "Update Webhook" : "Connect Slack"}
          </button>
        </div>
      </div>

      {/* Coming Soon */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-6">
        <p className="text-sm text-zinc-500 text-center">
          More integrations coming soon: Google Drive, Discord, Microsoft Teams
        </p>
      </div>
    </div>
  );
}

