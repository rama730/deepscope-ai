"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { Message } from "@/lib/services/messaging/index";

interface MessageToastProps {
  message: Message;
  senderName: string;
  senderAvatar?: string | null;
  conversationName?: string | null;
  isGroup: boolean;
  conversationId: string;
}

export function MessageToast({
  message,
  senderName,
  senderAvatar,
  conversationName,
  isGroup,
  conversationId,
}: MessageToastProps) {
  const router = useRouter();
  
  // Truncate message preview to 50 characters
  const messagePreview = message.content
    ? message.content.length > 50
      ? message.content.substring(0, 50) + "..."
      : message.content
    : "📎 Attachment";

  const handleClick = () => {
    router.push(`/messages?conversationId=${conversationId}`);
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-start gap-3 p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-lg hover:shadow-xl transition-shadow cursor-pointer min-w-[320px] max-w-[400px]"
    >
      {/* Sender Avatar */}
      {senderAvatar ? (
        <Image
          src={senderAvatar}
          alt={senderName}
          width={40}
          height={40}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
          {senderName[0]?.toUpperCase() || "U"}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
            {senderName}
          </p>
          {isGroup && conversationName && (
            <span className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              in {conversationName}
            </span>
          )}
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-300 line-clamp-2">
          {messagePreview}
        </p>
      </div>

      {/* Message Icon */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
        <svg
          className="w-4 h-4 text-blue-600 dark:text-blue-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </div>
    </div>
  );
}
