"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Download, FileText, Image as ImageIcon, File, ChevronLeft, ChevronRight } from "lucide-react";

interface FilePreviewModalProps {
  file: {
    id: string;
    name: string;
    file_url: string;
    file_type: string | null;
    file_size: number | null;
    description: string | null;
  } | null;
  files?: Array<{
    id: string;
    name: string;
    file_url: string;
    file_type: string | null;
  }>;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  showNavigation?: boolean;
}

export default function FilePreviewModal({
  file,
  files,
  onClose,
  onNext,
  onPrevious,
  showNavigation = false,
}: FilePreviewModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (file) {
      setLoading(true);
      setError(null);
      // Simulate loading for better UX
      setTimeout(() => setLoading(false), 300);
    }
  }, [file]);

  if (!file) return null;

  const isImage = file.file_type?.startsWith("image/");
  const isPdf = file.file_type === "application/pdf";
  const isText = file.file_type?.startsWith("text/");
  const isVideo = file.file_type?.startsWith("video/");

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleDownload() {
    if (file) {
      window.open(file.file_url, "_blank");
    }
  }

  function getFileIcon() {
    if (isImage) return ImageIcon;
    if (isPdf || isText) return FileText;
    return File;
  }

  const FileIcon = getFileIcon();

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="relative bg-white dark:bg-zinc-900 rounded-lg shadow-2xl max-w-7xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileIcon className="w-5 h-5 text-zinc-600 dark:text-zinc-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {file.name}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {formatFileSize(file.file_size)} • {file.file_type || "Unknown type"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showNavigation && files && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrevious?.();
                  }}
                  disabled={!onPrevious}
                  className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNext?.();
                  }}
                  disabled={!onNext}
                  className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded"
              title="Download"
            >
              <Download className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 rounded"
            >
              <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          {loading ? (
            <div className="text-zinc-500 dark:text-zinc-400">Loading...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : isImage ? (
            <div className="relative w-full h-full min-h-[50vh] flex items-center justify-center">
              <Image
                src={file.file_url}
                alt={file.name}
                fill
                className="object-contain"
                onError={() => setError("Failed to load image")}
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={file.file_url}
              className="w-full h-full min-h-[600px] border-0"
              title={file.name}
            />
          ) : isVideo ? (
            <video
              src={file.file_url}
              controls
              className="max-w-full max-h-full"
            />
          ) : isText ? (
            <div className="w-full max-w-4xl bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
              <pre className="text-sm text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap font-mono overflow-auto">
                Loading text content...
              </pre>
            </div>
          ) : (
            <div className="text-center">
              <FileIcon className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                Preview not available for this file type
              </p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Download File
              </button>
            </div>
          )}
        </div>

        {/* Description */}
        {file.description && (
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{file.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
