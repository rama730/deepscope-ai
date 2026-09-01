"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Github, ExternalLink, CheckCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui-custom/Toast";

interface GitHubIntegrationProps {
  projectId: string;
  currentRepository?: string | null;
  onRepositoryChange?: (repository: string | null) => void;
}

export default function GitHubIntegration({
  projectId,
  currentRepository,
  onRepositoryChange,
}: GitHubIntegrationProps) {
  const supabase = createSupabaseBrowserClient();
  const { showToast } = useToast();
  const [repository, setRepository] = useState(currentRepository || "");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [recentCommits, setRecentCommits] = useState<any[]>([]);
  const [recentPRs, setRecentPRs] = useState<any[]>([]);
  const [recentIssues, setRecentIssues] = useState<any[]>([]);

  useEffect(() => {
    if (currentRepository) {
      loadGitHubData();
    }
  }, [currentRepository]);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ github_repository: repository || null })
        .eq("id", projectId);

      if (error) throw error;

      showToast("GitHub repository updated", "success");
      onRepositoryChange?.(repository || null);
    } catch (err: any) {
      console.error("Error saving repository:", err);
      showToast("Failed to save repository: " + err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function loadGitHubData() {
    if (!currentRepository) return;

    setSyncing(true);
    try {
      // In a real implementation, you would call GitHub API here
      // For now, we'll simulate with placeholder data
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Placeholder data - replace with actual GitHub API calls
      setRecentCommits([
        { id: "1", message: "Fix bug in authentication", author: "user1", date: new Date() },
        { id: "2", message: "Add new feature", author: "user2", date: new Date() },
      ]);
      setRecentPRs([
        { id: "1", title: "Feature: New dashboard", status: "open", number: 42 },
        { id: "2", title: "Fix: Bug in API", status: "merged", number: 41 },
      ]);
      setRecentIssues([
        { id: "1", title: "Bug: Login not working", status: "open", number: 10 },
        { id: "2", title: "Feature: Add dark mode", status: "closed", number: 9 },
      ]);

      showToast("GitHub data synced", "success");
    } catch (err: any) {
      console.error("Error syncing GitHub data:", err);
      showToast("Failed to sync GitHub data", "error");
    } finally {
      setSyncing(false);
    }
  }

  function parseRepositoryUrl(url: string): { owner: string; repo: string } | null {
    // Support formats: https://github.com/owner/repo, owner/repo, github.com/owner/repo
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/]+)/,
      /^([^\/]+)\/([^\/]+)$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1] && match[2]) {
        return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
      }
    }

    return null;
  }

  const repoInfo = repository ? parseRepositoryUrl(repository) : null;
  const repoUrl = repoInfo
    ? `https://github.com/${repoInfo.owner}/${repoInfo.repo}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <Github className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">GitHub Integration</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Connect your project to a GitHub repository
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Repository URL or Owner/Repo</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={repository}
              onChange={(e) => setRepository(e.target.value)}
              placeholder="owner/repo or https://github.com/owner/repo"
              className="flex-1 px-4 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800"
            />
            <button
              onClick={handleSave}
              disabled={saving || repository === currentRepository}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Enter repository in format: owner/repo or full GitHub URL
          </p>
        </div>

        {currentRepository && repoUrl && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <span className="font-medium text-zinc-900 dark:text-zinc-100">Connected</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadGitHubData}
                  disabled={syncing}
                  className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  title="Sync data"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                </button>
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
            >
              {repoUrl}
            </a>
          </div>
        )}

        {/* Recent Activity */}
        {currentRepository && (
          <div className="space-y-4">
            {/* Recent Commits */}
            {recentCommits.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-zinc-900 dark:text-zinc-100">Recent Commits</h4>
                <div className="space-y-2">
                  {recentCommits.map((commit) => (
                    <div
                      key={commit.id}
                      className="p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
                    >
                      <p className="text-sm text-zinc-900 dark:text-zinc-100">{commit.message}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {commit.author} • {commit.date.toLocaleDateString("en-US")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Pull Requests */}
            {recentPRs.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-zinc-900 dark:text-zinc-100">Recent Pull Requests</h4>
                <div className="space-y-2">
                  {recentPRs.map((pr) => (
                    <div
                      key={pr.id}
                      className="p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{pr.title}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">#{pr.number}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${pr.status === "merged"
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                            : pr.status === "open"
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            }`}
                        >
                          {pr.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Issues */}
            {recentIssues.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 text-zinc-900 dark:text-zinc-100">Recent Issues</h4>
                <div className="space-y-2">
                  {recentIssues.map((issue) => (
                    <div
                      key={issue.id}
                      className="p-3 bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{issue.title}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">#{issue.number}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${issue.status === "open"
                            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                            }`}
                        >
                          {issue.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

