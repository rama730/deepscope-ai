"use client";

import { useState, useEffect, useRef } from "react";
import { User } from "lucide-react";

interface User {
  id: string;
  full_name: string | null;
  username: string | null;
}

interface MentionAutocompleteProps {
  members: User[];
  onSelect: (userId: string, username: string) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export default function MentionAutocomplete({
  members,
  onSelect,
  onClose,
  position
}: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, members.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (members[selectedIndex]) {
          const user = members[selectedIndex];
          onSelect(user.id, user.username || user.full_name || "User");
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [members, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (members.length === 0) return null;

  return (
    <div
      className="absolute z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg max-h-48 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
      ref={listRef}
    >
      {members.map((member, index) => (
        <button
          key={member.id}
          onClick={() => onSelect(member.id, member.username || member.full_name || "User")}
          className={`w-full text-left px-4 py-2 flex items-center gap-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${index === selectedIndex ? "bg-indigo-50 dark:bg-indigo-950/30" : ""
            }`}
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
            {(member.full_name || member.username || "U")[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
              {member.full_name || member.username || "User"}
            </div>
            {member.username && member.full_name && (
              <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                @{member.username}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

