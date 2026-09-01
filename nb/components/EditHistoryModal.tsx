"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { X, Clock, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EditHistoryProps {
  postId: string;
  onClose: () => void;
}

interface EditEntry {
  id: string;
  content: string;
  media_urls: any;
  edited_at: string;
  edited_by: string;
}

export default function EditHistoryModal({ postId, onClose }: EditHistoryProps) {
  const supabase = createSupabaseBrowserClient();
  const [history, setHistory] = useState<EditEntry[]>([]);
  const [currentContent, setCurrentContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    loadEditHistory();
  }, [postId]);

  async function loadEditHistory() {
    setLoading(true);

    try {
      // Get current post content
      const { data: post } = await supabase
        .from("posts")
        .select("content, media_urls")
        .eq("id", postId)
        .single();

      if (post) {
        setCurrentContent(post.content);
      }

      // Get edit history
      const { data: edits } = await supabase
        .from("post_edit_history")
        .select("*")
        .eq("post_id", postId)
        .order("edited_at", { ascending: false });

      setHistory(edits || []);
    } catch (error) {
      console.error("Error loading edit history:", error);
    } finally {
      setLoading(false);
    }
  }

  function getDiff(oldText: string, newText: string) {
    // Simple word-based diff
    const oldWords = oldText.split(/(\s+)/);
    const newWords = newText.split(/(\s+)/);

    const result: { type: "same" | "added" | "removed"; text: string }[] = [];
    let i = 0;
    let j = 0;

    while (i < oldWords.length || j < newWords.length) {
      if (i >= oldWords.length) {
        result.push({ type: "added", text: newWords[j]! });
        j++;
      } else if (j >= newWords.length) {
        result.push({ type: "removed", text: oldWords[i]! });
        i++;
      } else if (oldWords[i] === newWords[j]) {
        result.push({ type: "same", text: oldWords[i]! });
        i++;
        j++;
      } else {
        result.push({ type: "removed", text: oldWords[i]! });
        result.push({ type: "added", text: newWords[j]! });
        i++;
        j++;
      }
    }

    return result;
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Edit History</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:bg-zinc-900 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-zinc-300" />
              <p>No edit history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Current version */}
              <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 bg-blue-50">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded">
                    Current
                  </span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">Latest version</span>
                </div>
                <p className="text-zinc-900 dark:text-zinc-50 whitespace-pre-wrap">{currentContent}</p>
              </div>

              {/* Previous versions */}
              {history.map((entry, index) => (
                <div key={entry.id} className="border border-zinc-200 dark:border-zinc-700 rounded-lg">
                  <button
                    onClick={() =>
                      setSelectedIndex(selectedIndex === index ? null : index)
                    }
                    className="w-full p-4 flex items-center justify-between hover:bg-zinc-50 dark:bg-zinc-900 transition-colors"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <Clock className="w-4 h-4 text-zinc-400" />
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                          Version {history.length - index}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {formatDistanceToNow(new Date(entry.edited_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-zinc-400 transition-transform ${selectedIndex === index ? "rotate-90" : ""
                        }`}
                    />
                  </button>

                  {selectedIndex === index && (
                    <div className="px-4 pb-4 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                        Previous content:
                      </p>
                      <p className="text-zinc-900 dark:text-zinc-50 whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-900 p-3 rounded">
                        {entry.content}
                      </p>

                      {index === 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                            Changes:
                          </p>
                          <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded text-sm">
                            {getDiff(entry.content, currentContent).map(
                              (part, i) => (
                                <span
                                  key={i}
                                  className={
                                    part.type === "added"
                                      ? "bg-green-200"
                                      : part.type === "removed"
                                        ? "bg-red-200 line-through"
                                        : ""
                                  }
                                >
                                  {part.text}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


