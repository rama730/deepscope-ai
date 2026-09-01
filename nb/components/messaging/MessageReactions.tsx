"use client";

import { useState } from "react";
import { Smile, Plus } from "lucide-react";
import ReactionPicker from "./ReactionPicker";

interface MessageReactionsProps {
  reactions: Record<string, string[]>; // { "👍": ["user_id1", "user_id2"], ... }
  currentUserId: string | null;
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  messageId: string;
}

export default function MessageReactions({
  reactions,
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  // messageId 
}: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });

  const reactionEntries = Object.entries(reactions || {}).filter(([_, userIds]) => userIds.length > 0);

  function handleReactionClick(emoji: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!currentUserId) return;

    const userIds = reactions[emoji] || [];
    const hasReacted = userIds.includes(currentUserId);

    if (hasReacted) {
      onRemoveReaction(emoji);
    } else {
      onAddReaction(emoji);
    }
  }

  function handleAddReaction(e: React.MouseEvent) {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPickerPosition({
      top: rect.top - 60,
      left: rect.left
    });
    setShowPicker(true);
  }

  if (reactionEntries.length === 0 && !showPicker) {
    return (
      <button
        onClick={handleAddReaction}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-full hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400"
        title="Add reaction"
      >
        <Smile className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reactionEntries.map(([emoji, userIds]) => {
        const hasReacted = currentUserId ? userIds.includes(currentUserId) : false;
        return (
          <button
            key={emoji}
            onClick={(e) => handleReactionClick(emoji, e)}
            className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 transition-colors ${hasReacted
                ? "bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-700"
                : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700"
              }`}
            title={`${userIds.length} reaction${userIds.length !== 1 ? 's' : ''}`}
          >
            <span>{emoji}</span>
            <span className={`text-xs font-medium ${hasReacted ? "text-indigo-700 dark:text-indigo-300" : "text-zinc-600 dark:text-zinc-400"
              }`}>
              {userIds.length}
            </span>
          </button>
        );
      })}
      <button
        onClick={handleAddReaction}
        className="opacity-0 group-hover:opacity-100 transition-opacity px-2 py-0.5 rounded-full hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-xs text-zinc-500 dark:text-zinc-400"
        title="Add reaction"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      {showPicker && (
        <ReactionPicker
          onSelect={(emoji) => {
            onAddReaction(emoji);
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
          position={pickerPosition}
        />
      )}
    </div>
  );
}

