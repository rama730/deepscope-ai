"use client";

import { memo, useMemo } from "react";
// Removed framer-motion import
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  avatar?: string;
  status?: "online" | "away" | "busy" | "offline";
  lastSeen?: string;
}

interface PresenceIndicatorProps {
  users: User[];
  maxDisplay?: number;
  showNames?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeConfig = {
  sm: { avatar: "w-6 h-6", text: "text-xs", overlap: "-ml-1.5", pulse: "w-1.5 h-1.5" },
  md: { avatar: "w-8 h-8", text: "text-sm", overlap: "-ml-2", pulse: "w-2 h-2" },
  lg: { avatar: "w-10 h-10", text: "text-sm", overlap: "-ml-2.5", pulse: "w-2.5 h-2.5" },
};

const statusColors = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  busy: "bg-rose-500",
  offline: "bg-zinc-400",
};

function PresenceIndicator({
  users,
  maxDisplay = 5,
  showNames = false,
  size = "md",
  className,
}: PresenceIndicatorProps) {
  const config = sizeConfig[size];

  const onlineUsers = useMemo(
    () => users.filter((u) => u.status === "online" || u.status === "away"),
    [users]
  );

  const displayUsers = onlineUsers.slice(0, maxDisplay);
  const remainingCount = onlineUsers.length - maxDisplay;

  if (onlineUsers.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-zinc-500", className)}>
        <div className="w-2 h-2 rounded-full bg-zinc-400" />
        <span className={config.text}>No one online</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Avatar stack */}
      <div className="flex items-center">
        {displayUsers.map((user, index) => (
          <div
            key={user.id}
            className={cn(
              "relative rounded-full ring-2 ring-white dark:ring-zinc-900 transition-all duration-300 ease-in-out",
              config.avatar,
              index > 0 && config.overlap
            )}
            style={{
              zIndex: displayUsers.length - index,
              // Simple entrance animation simulation via inline styles or just let it render
            }}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium text-xs">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Status indicator */}
            <span
              className={cn(
                "absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-zinc-900",
                config.pulse,
                statusColors[user.status || "offline"]
              )}
            >
              {user.status === "online" && (
                <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
              )}
            </span>
          </div>
        ))}

        {/* Overflow indicator */}
        {remainingCount > 0 && (
          <div
            className={cn(
              "rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300 font-medium ring-2 ring-white dark:ring-zinc-900 transition-all",
              config.avatar,
              config.overlap,
              config.text
            )}
          >
            +{remainingCount}
          </div>
        )}
      </div>

      {/* Label */}
      {showNames && displayUsers.length > 0 && (
        <div className={cn("text-zinc-600 dark:text-zinc-400", config.text)}>
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {displayUsers[0]?.name}
          </span>
          {displayUsers.length === 2 && (
            <span> and {displayUsers[1]?.name}</span>
          )}
          {displayUsers.length > 2 && (
            <span> and {onlineUsers.length - 1} others</span>
          )}
          <span> online</span>
        </div>
      )}

      {/* Simple counter */}
      {!showNames && (
        <span className={cn("text-zinc-500 dark:text-zinc-400", config.text)}>
          {onlineUsers.length} online
        </span>
      )}
    </div>
  );
}

export default memo(PresenceIndicator);

