"use client";



interface ThreadVisualsProps {
  threadContext?: "start" | "middle" | "end";
}

export function ThreadVisuals({ threadContext }: ThreadVisualsProps) {
  if (!threadContext) return null;

  return (
    <>
      {(threadContext === "middle" || threadContext === "end") && (
        <div
          className={`absolute -top-5 left-1/2 -translate-x-1/2 z-0 opacity-50 w-[2px] bg-gradient-to-b from-zinc-200 via-zinc-200 to-transparent dark:from-zinc-800 dark:via-zinc-800 ${threadContext === "end" ? "h-[40px]" : "h-[calc(100%+20px)]"}`}
        />
      )}
      {(threadContext === "start" || threadContext === "middle") && (
        <div className="absolute top-10 -bottom-5 w-[2px] bg-gradient-to-b from-transparent via-zinc-200 to-zinc-200 dark:via-zinc-800 dark:to-zinc-800 left-1/2 -translate-x-1/2 z-0 opacity-50" />
      )}
    </>
  );
}
