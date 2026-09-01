"use client";

import { useState } from "react";
import { Smile, Search } from "lucide-react";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const emojiCategories = {
  "Smileys & People": [
    "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊",
    "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "😋", "😛", "😜", "🤪",
    "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏",
    "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕",
    "🤢", "🤮", "🤧", "🥵", "🥶", "😵", "🤯", "🤠", "🥳", "😎", "🤓", "🧐",
  ],
  "Gestures": [
    "👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "👌", "🤏",
    "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "🖖", "👋", "🤙", "💪",
    "🦾", "🖕", "✍️", "🙏", "🤝", "👏", "👐", "🙌",
  ],
  "Hearts": [
    "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕",
    "💞", "💓", "💗", "💖", "💘", "💝", "💟",
  ],
  "Objects": [
    "🔥", "⭐", "✨", "💫", "💥", "💯", "🎉", "🎊", "🎈", "🎁", "🏆", "🥇",
    "🥈", "🥉", "⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🎮", "🎯", "🎲", "🎭",
    "🎨", "🎬", "🎤", "🎧", "🎵", "🎶", "📱", "💻", "⌨️", "🖥️", "🖨️", "💡",
    "🔔", "📢", "📣", "📦", "✉️", "📧", "📨", "💌",
  ],
  "Nature": [
    "🌞", "🌝", "🌛", "🌜", "🌚", "🌕", "🌖", "🌗", "🌘", "🌑", "🌒", "🌓",
    "🌔", "🌙", "⭐", "🌟", "✨", "⚡", "☄️", "💥", "🔥", "🌈", "☀️", "🌤️",
    "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "🌨️", "❄️", "☃️", "⛄",
  ],
  "Food": [
    "🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍",
    "🥥", "🥝", "🍅", "🍆", "🥑", "🥦", "🥬", "🥒", "🌶️", "🌽", "🥕", "🥔",
    "🍠", "🥐", "🥖", "🥨", "🥯", "🧀", "🥚", "🍳", "🥞", "🧇", "🥓", "🍔",
    "🍟", "🍕", "🌭", "🥪", "🌮", "🌯", "🥙", "🧆", "🥗", "🍿", "🧈", "🧂",
  ],
};

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState("Smileys & People");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmojis = searchQuery
    ? Object.values(emojiCategories)
        .flat()
        .filter((emoji) => emoji.includes(searchQuery))
    : emojiCategories[activeCategory as keyof typeof emojiCategories] || [];

  return (
    <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-80 z-20">
      {/* Search */}
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search emojis"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Categories */}
      {!searchQuery && (
        <div className="flex gap-1 px-3 py-2 border-b border-zinc-200 dark:border-zinc-700 overflow-x-auto scrollbar-hide">
          {Object.keys(emojiCategories).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                activeCategory === category
                  ? "bg-blue-100 text-blue-600"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-900"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="p-3 max-h-64 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1">
          {filteredEmojis.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              className="text-2xl hover:bg-zinc-100 dark:bg-zinc-900 rounded p-1 transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
        {filteredEmojis.length === 0 && (
          <div className="text-center py-6 text-zinc-500 text-sm">
            No emojis found
          </div>
        )}
      </div>
    </div>
  );
}

export function EmojiButton({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 rounded-full transition-colors"
      >
        <Smile className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
      </button>

      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowPicker(false)}
          />
          <EmojiPicker
            onSelect={(emoji) => {
              onSelect(emoji);
              setShowPicker(false);
            }}
            onClose={() => setShowPicker(false)}
          />
        </>
      )}
    </div>
  );
}


