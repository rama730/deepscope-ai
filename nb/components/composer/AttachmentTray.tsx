"use client";

import Image from "next/image";
import { UploadFile } from "@/hooks/useFileUpload";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "";
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function AttachmentTray({
  files,
  onRemove,
  onRetry,
}: {
  files: UploadFile[];
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  if (!files || files.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {files.map((f) => (
        <div
          key={f.id}
          className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2"
        >
          <div className="relative h-10 w-10 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
            {f.preview ? (
              <Image
                src={f.preview}
                alt=""
                fill
                className="object-cover"
                unoptimized={f.preview.startsWith("data:") || f.preview.startsWith("blob:")}
              />
            ) : (
              <span className="text-[10px] font-semibold text-zinc-500">
                {f.name.split(".").pop()?.toUpperCase() || "FILE"}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {f.name}
                </div>
                <div className="text-xs text-zinc-500">
                  {formatBytes(f.size)} {f.type ? `· ${f.type}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(f.id)}
                className="text-xs px-2 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors"
              >
                Remove
              </button>
            </div>

            {/* Status row */}
            <div className="mt-2 flex items-center gap-2">
              {f.status === "uploading" && (
                <>
                  <div className="h-1.5 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                      style={{ width: `${Math.max(2, Math.min(100, f.progress))}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-zinc-500">{Math.round(f.progress)}%</span>
                </>
              )}

              {f.status === "pending" && (
                <span className="text-[11px] text-zinc-500">Ready to upload</span>
              )}

              {f.status === "completed" && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Uploaded
                </span>
              )}

              {f.status === "error" && (
                <div className="flex items-center justify-between gap-2 w-full">
                  <span className="text-[11px] text-red-600 dark:text-red-400 truncate">
                    {f.error || "Upload failed"}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRetry(f.id)}
                    className="text-[11px] px-2 py-1 rounded-full border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


