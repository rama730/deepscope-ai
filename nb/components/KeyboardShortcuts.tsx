"use client";

import { useEffect, useState } from "react";
import { X, Keyboard } from "lucide-react";
import { useRouter } from "next/navigation";

interface KeyboardShortcutsProps {
  onNewPost?: () => void;
  onSearch?: () => void;
}

export function useKeyboardShortcuts({
  onNewPost,
  onSearch,
}: KeyboardShortcutsProps = {}) {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape key even in inputs
        if (e.key === "Escape") {
          target.blur();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case "n":
          e.preventDefault();
          onNewPost?.();
          break;
        case "/":
          e.preventDefault();
          onSearch?.();
          break;
        case "g":
          // Wait for next key for "go to" shortcuts
          setTimeout(() => {
            document.addEventListener(
              "keydown",
              (nextE) => {
                switch (nextE.key.toLowerCase()) {
                  case "h":
                    router.push("/explorer");
                    break;
                  case "p":
                    router.push("/profile");
                    break;
                  case "n":
                    router.push("/people");
                    break;
                  case "m":
                    router.push("/messages");
                    break;
                  case "s":
                    router.push("/hub");
                    break;
                }
              },
              { once: true }
            );
          }, 0);
          break;
        case "?":
          e.preventDefault();
          setShowHelp(true);
          break;
        case "escape":
          setShowHelp(false);
          break;
      }
    }

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [onNewPost, onSearch, router]);

  return { showHelp, setShowHelp };
}

export function KeyboardShortcutsHelp({
  show,
  onClose,
}: {
  show: boolean;
  onClose: () => void;
}) {
  if (!show) return null;

  const shortcuts = [
    {
      category: "Actions",
      items: [
        { key: "N", description: "New post" },
        { key: "/", description: "Search" },
        { key: "?", description: "Show keyboard shortcuts" },
        { key: "Esc", description: "Close modals / Clear focus" },
      ],
    },
    {
      category: "Navigation",
      items: [
        { key: "G then H", description: "Go to Home (Explorer)" },
        { key: "G then P", description: "Go to Profile" },
        { key: "G then N", description: "Go to Network (People)" },
        { key: "G then M", description: "Go to Messages" },
        { key: "G then S", description: "Go to Saved (Hub)" },
      ],
    },
    {
      category: "Feed Actions",
      items: [
        { key: "J / K", description: "Next / Previous post" },
        { key: "L", description: "Like post" },
        { key: "R", description: "Reply to post" },
        { key: "T", description: "Repost" },
        { key: "S", description: "Save / bookmark post" },
        { key: "Enter", description: "Open post detail" },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:bg-zinc-900 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
                  {section.category}
                </h4>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-center justify-between py-2 px-3 hover:bg-zinc-50 dark:bg-zinc-900 rounded-lg"
                    >
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">
                        {item.description}
                      </span>
                      <kbd className="px-2 py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded shadow-sm">
                        {item.key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 text-center">
          <p className="text-xs text-zinc-500">
            Press <kbd className="px-1.5 py-0.5 text-xs bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  );
}


