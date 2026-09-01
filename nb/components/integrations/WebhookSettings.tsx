"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Webhook, Plus, Trash2, ExternalLink, Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui-custom/Toast";

interface Webhook {
  id: string;
  project_id: string;
  url: string;
  events: string[];
  secret: string | null;
  active: boolean;
  created_at: string;
}

interface WebhookSettingsProps {
  projectId: string;
}

const AVAILABLE_EVENTS = [
  { id: "task.created", label: "Task Created" },
  { id: "task.updated", label: "Task Updated" },
  { id: "task.completed", label: "Task Completed" },
  { id: "file.uploaded", label: "File Uploaded" },
  { id: "member.added", label: "Member Added" },
  { id: "application.received", label: "Application Received" },
  { id: "application.accepted", label: "Application Accepted" },
  { id: "message.sent", label: "Message Sent" },
];

export default function WebhookSettings({ projectId }: WebhookSettingsProps) {
  const supabase = createSupabaseBrowserClient();
  const { showToast } = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    url: "",
    events: [] as string[],
    secret: "",
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadWebhooks();
  }, [projectId]);

  async function loadWebhooks() {
    setLoading(true);
    try {
      // In a real implementation, you would have a webhooks table
      // For now, we'll use a placeholder
      const { data, error } = await supabase
        .from("project_webhooks")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error && error.code !== "PGRST116") {
        // PGRST116 = table doesn't exist, which is expected if migration hasn't run
        throw error;
      }

      setWebhooks((data || []) as Webhook[]);
    } catch (err: any) {
      console.error("Error loading webhooks:", err);
      // Table might not exist yet, that's okay
      setWebhooks([]);
    } finally {
      setLoading(false);
    }
  }

  async function createWebhook() {
    if (!newWebhook.url || newWebhook.events.length === 0) {
      showToast("URL and at least one event are required", "warning");
      return;
    }

    try {
      const { error } = await supabase
        .from("project_webhooks")
        .insert({
          project_id: projectId,
          url: newWebhook.url,
          events: newWebhook.events,
          secret: newWebhook.secret || null,
          active: true,
        })
        .select()
        .single();

      if (error) throw error;

      showToast("Webhook created successfully", "success");
      setShowCreateModal(false);
      setNewWebhook({ url: "", events: [], secret: "" });
      loadWebhooks();
    } catch (err: any) {
      console.error("Error creating webhook:", err);
      showToast("Failed to create webhook: " + err.message, "error");
    }
  }

  async function deleteWebhook(webhookId: string) {
    if (!confirm("Delete this webhook?")) return;

    try {
      const { error } = await supabase
        .from("project_webhooks")
        .delete()
        .eq("id", webhookId);

      if (error) throw error;

      showToast("Webhook deleted", "success");
      loadWebhooks();
    } catch (err: any) {
      console.error("Error deleting webhook:", err);
      showToast("Failed to delete webhook", "error");
    }
  }

  async function toggleWebhook(webhookId: string, active: boolean) {
    try {
      const { error } = await supabase
        .from("project_webhooks")
        .update({ active: !active })
        .eq("id", webhookId);

      if (error) throw error;

      showToast(`Webhook ${!active ? "activated" : "deactivated"}`, "success");
      loadWebhooks();
    } catch (err: any) {
      console.error("Error toggling webhook:", err);
      showToast("Failed to update webhook", "error");
    }
  }

  function copyWebhookId(id: string) {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    showToast("Webhook ID copied", "success");
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) {
    return <div className="text-center py-8 text-zinc-500">Loading webhooks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <Webhook className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Webhooks</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Receive real-time notifications for project events
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </button>
      </div>

      {webhooks.length === 0 ? (
        <div className="text-center py-8 text-zinc-500">
          <Webhook className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
          <p>No webhooks configured</p>
          <p className="text-sm mt-1">Create a webhook to receive project event notifications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map(webhook => (
            <div
              key={webhook.id}
              className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <a
                      href={webhook.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center gap-1"
                    >
                      {webhook.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${webhook.active
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        }`}
                    >
                      {webhook.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {webhook.events.map(event => (
                      <span
                        key={event}
                        className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 rounded text-xs"
                      >
                        {AVAILABLE_EVENTS.find(e => e.id === event)?.label || event}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyWebhookId(webhook.id)}
                    className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded"
                    title="Copy webhook ID"
                  >
                    {copiedId === webhook.id ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Copy className="w-4 h-4 text-zinc-500" />
                    )}
                  </button>
                  <button
                    onClick={() => toggleWebhook(webhook.id, webhook.active)}
                    className="px-3 py-1 text-sm border rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  >
                    {webhook.active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => deleteWebhook(webhook.id)}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Create Webhook</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Webhook URL *</label>
                <input
                  type="url"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="https://your-server.com/webhook"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Events *</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                  {AVAILABLE_EVENTS.map(event => (
                    <label key={event.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newWebhook.events.includes(event.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewWebhook({ ...newWebhook, events: [...newWebhook.events, event.id] });
                          } else {
                            setNewWebhook({ ...newWebhook, events: newWebhook.events.filter(id => id !== event.id) });
                          }
                        }}
                      />
                      <span className="text-sm">{event.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Secret (Optional)</label>
                <input
                  type="text"
                  value={newWebhook.secret}
                  onChange={(e) => setNewWebhook({ ...newWebhook, secret: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Webhook secret for verification"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Use this to verify webhook requests
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={createWebhook}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Create Webhook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

