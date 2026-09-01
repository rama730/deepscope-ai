"use client";




const COMMON_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "👏", "💯", "🚀"];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

export default function ReactionPicker({ onSelect, onClose, position }: ReactionPickerProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        className="absolute z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg p-2 flex gap-1"
        style={{ top: position.top, left: position.left }}
        onClick={(e) => e.stopPropagation()}
      >
        {COMMON_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded transition-colors"
            title={emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}

