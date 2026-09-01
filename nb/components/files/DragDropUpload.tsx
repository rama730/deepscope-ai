"use client";

import { useState, useRef, DragEvent } from "react";
import { Upload, X, File } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui-custom/Toast";

interface DragDropUploadProps {
  projectId: string;
  onUploadComplete?: (fileIds: string[]) => void;
  category?: string;
  submissionType?: string;
  maxFiles?: number;
  acceptedTypes?: string[];
  linkedTaskId?: string;
}

export default function DragDropUpload({
  projectId,
  onUploadComplete,
  category = "general",
  submissionType = "upload",
  maxFiles = 10,
  acceptedTypes,
  linkedTaskId,
}: DragDropUploadProps) {
  const supabase = createSupabaseBrowserClient();
  const { showToast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDragEnter(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  }

  function handleFiles(files: File[]) {
    // Filter by accepted types if specified
    const filteredFiles = acceptedTypes
      ? files.filter(file => acceptedTypes.some(type => file.type.includes(type)))
      : files;

    // Limit to maxFiles
    const filesToAdd = filteredFiles.slice(0, maxFiles - selectedFiles.length);

    if (filesToAdd.length < filteredFiles.length) {
      showToast(`Only ${maxFiles} files allowed. Some files were not added.`, "warning");
    }

    setSelectedFiles(prev => [...prev, ...filesToAdd]);
  }

  function removeFile(index: number) {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    const uploadedFileIds: string[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (!file) continue;
        const fileExt = file.name.split('.').pop();
        const fileName = `${projectId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        const { error: uploadError } = await supabase.storage
          .from("project-files")
          .upload(fileName, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          showToast(`Failed to upload ${file.name}: ${uploadError.message}`, "error");
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from("project-files")
          .getPublicUrl(fileName);

        const { data: fileData, error: fileError } = await supabase
          .from("project_files")
          .insert({
            project_id: projectId,
            name: file.name,
            file_url: publicUrl,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id,
            category,
            submission_type: submissionType,
            linked_task_id: linkedTaskId,
          })
          .select("id")
          .single();

        if (fileError) {
          showToast(`Failed to save ${file.name}: ${fileError.message}`, "error");
          continue;
        }

        if (fileData) {
          uploadedFileIds.push(fileData.id);
        }

        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }

      if (uploadedFileIds.length > 0) {
        showToast(`Successfully uploaded ${uploadedFileIds.length} file(s)`, "success");
        setSelectedFiles([]);
        onUploadComplete?.(uploadedFileIds);
      }
    } catch (err) {
      console.error("Upload error:", err);
      showToast("An error occurred during upload", "error");
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging
          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30"
          : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600"
          }`}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? "text-indigo-600" : "text-zinc-400"}`} />
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
          {isDragging ? "Drop files here" : "Drag and drop files here"}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500 mb-4">
          or click to browse
        </p>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          Select Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept={acceptedTypes?.join(",")}
        />
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Selected Files ({selectedFiles.length})
            </p>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {uploading ? "Uploading..." : "Upload All"}
            </button>
          </div>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
              >
                <File className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                  {uploadProgress[file.name] !== undefined && (
                    <div className="mt-1 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full h-1.5">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress[file.name]}%` }}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => removeFile(index)}
                  disabled={uploading}
                  className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded disabled:opacity-50"
                >
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

