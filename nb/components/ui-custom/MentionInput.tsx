"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Member {
  user_id: string;
  profiles: {
    full_name: string | null;
    username: string | null;
  } | null;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  members: Member[];
  placeholder?: string;
  className?: string;
  rows?: number;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function MentionInput({
  value,
  onChange,
  members,
  placeholder = "Type @ to mention someone...",
  className = "",
  rows = 3,
  disabled = false,
  autoFocus = false,
}: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [mentionTriggerPos, setMentionTriggerPos] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });

  // Filter members based on query
  const filteredMembers = members.filter(
    (member) =>
      member.profiles?.full_name?.toLowerCase().includes(mentionQuery.toLowerCase()) ||
      member.profiles?.username?.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Handle value changes
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart;
    onChange(newValue);

    // Check for @ mention trigger
    const textBeforeCursor = newValue.substring(0, cursorPosition);
    const lastAtSymbolIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtSymbolIndex !== -1) {
      const query = textBeforeCursor.substring(lastAtSymbolIndex + 1);
      // Only trigger if @ is at start or after space
      if (lastAtSymbolIndex === 0 || textBeforeCursor[lastAtSymbolIndex - 1] === " " || textBeforeCursor[lastAtSymbolIndex - 1] === "\n") {
        setMentionQuery(query);
        setMentionStartIndex(lastAtSymbolIndex);
        setMentionTriggerPos(cursorPosition);
        setShowMentions(true);
        setSelectedIndex(0);

        // Calculate position (approximation)
        if (textareaRef.current) {
          const { selectionStart } = textareaRef.current;
          const lines = newValue.substring(0, selectionStart).split("\n");
          const currentLineIndex = lines.length - 1;
          const lineHeight = 20; // estimate
          setMentionPosition({
            top: (currentLineIndex + 1) * lineHeight + 10,
            left: 0, // usually we show it below or overlay
          });
        }
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  // Insert mention
  const insertMention = useCallback((member: Member) => {
    // Use username for mentions to match parseMentions regex which only matches word characters
    const mentionText = member.profiles?.username || "user";
    const beforeMention = value.substring(0, mentionStartIndex);
    const afterCursor = value.substring(mentionTriggerPos >= 0 ? mentionTriggerPos : (textareaRef.current?.selectionStart || 0));
    const newValue = `${beforeMention}@${mentionText} ${afterCursor}`;

    onChange(newValue);
    setShowMentions(false);

    // Refocus and set cursor
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = mentionStartIndex + mentionText.length + 2;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }, [value, mentionStartIndex, mentionTriggerPos, onChange, setShowMentions]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showMentions || filteredMembers.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredMembers.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        break;
      case "Enter":
      case "Tab":
        e.preventDefault();
        if (filteredMembers[selectedIndex]) {
          insertMention(filteredMembers[selectedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowMentions(false);
        break;
    }
  }, [showMentions, filteredMembers, selectedIndex, insertMention]);

  // Close mentions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setShowMentions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`w-full px-4 py-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm resize-none disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      />

      {/* Mention Dropdown */}
      <AnimatePresence>
        {showMentions && filteredMembers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ top: mentionPosition.top }}
            className="absolute left-0 right-0 z-50 mt-1 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg max-h-48 overflow-y-auto"
          >
            <div className="px-3 py-1.5 text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-3 h-3 text-zinc-400">@</span>
              Mention someone
            </div>
            {filteredMembers.map((member, index) => (
              <button
                key={member.user_id}
                type="button"
                onClick={() => insertMention(member)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${index === selectedIndex
                  ? "bg-blue-50 dark:bg-blue-900/20"
                  : "hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-700/50"
                  }`}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  {(member.profiles?.full_name?.[0] || member.profiles?.username?.[0] || "U").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {member.profiles?.full_name || member.profiles?.username}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">
                    @{member.profiles?.username}
                  </p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper to parse mentions in text
export function parseMentions(text: string, members: Member[]) {
  const mentionRegex = /@(\w+)/g;
  const mentions: Array<{ userId: string; name: string }> = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    const mentionName = match[1]?.toLowerCase();
    const member = members.find(
      (m) =>
        m.profiles?.full_name?.toLowerCase() === mentionName ||
        m.profiles?.username?.toLowerCase() === mentionName
    );

    if (member) {
      mentions.push({
        userId: member.user_id,
        name: member.profiles?.full_name || member.profiles?.username || "User",
      });
    }
  }

  return mentions;
}
