"use client";

import { useState } from "react";
import { File, Image as ImageIcon, FileText, Download, X, ExternalLink } from "lucide-react";
import Image from "next/image";


interface FilePreviewProps {
  fileId: string;
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
  onRemove?: () => void;
  compact?: boolean;
}

export default function FilePreview({
  // fileId,
  fileName,
  fileUrl,
  fileType,
  onRemove,
  compact = false
}: FilePreviewProps) {
  const [previewOpen, setPreviewOpen] = useState(false);


  const isImage = fileType?.startsWith("image/");
  const isPdf = fileType === "application/pdf";
  const isText = fileType?.startsWith("text/");

  function getFileIcon() {
    if (isImage) return ImageIcon;
    if (isPdf || isText) return FileText;
    return File;
  }

  const Icon = getFileIcon();

  function handleDownload() {
    window.open(fileUrl, "_blank");
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700">
        <Icon className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
        <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate max-w-[200px]">
          {fileName}
        </span>
        {onRemove && (
          <button
            onClick={onRemove}
            className="ml-1 p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"
          >
            <X className="w-3 h-3 text-zinc-500" />
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="relative group border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors">
        {isImage ? (
          <div className="relative h-32 w-full">
            <Image
              src={fileUrl}
              alt={fileName}
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              className="object-cover cursor-pointer"
              onClick={() => setPreviewOpen(true)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <button
                onClick={() => setPreviewOpen(true)}
                className="opacity-0 group-hover:opacity-100 p-2 bg-white/90 dark:bg-zinc-900/90 rounded-full shadow-lg transition-opacity"
              >
                <ExternalLink className="w-4 h-4 text-zinc-900 dark:text-zinc-100" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <Icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                {fileName}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {fileType || "File"}
              </p>
            </div>
          </div>
        )}

        <div className="absolute top-2 right-2 flex gap-1">
          <button
            onClick={handleDownload}
            className="p-1.5 bg-white/90 dark:bg-zinc-900/90 rounded-full shadow-md hover:bg-white dark:hover:bg-zinc-800 transition-colors"
            title="Download"
          >
            <Download className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
          </button>
          {onRemove && (
            <button
              onClick={onRemove}
              className="p-1.5 bg-white/90 dark:bg-zinc-900/90 rounded-full shadow-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              title="Remove"
            >
              <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Full Preview Modal */}
      {previewOpen && isImage && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewOpen(false)}
        >
          <button
            onClick={() => setPreviewOpen(false)}
            className="absolute top-4 right-4 p-2 bg-white dark:bg-zinc-900/10 hover:bg-white dark:bg-zinc-900/20 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="relative w-full h-full max-w-4xl max-h-[90vh]">
            <Image
              src={fileUrl}
              alt={fileName}
              fill
              className="object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}
