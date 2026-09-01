"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/common/EmptyState";
import { FileText, Lock } from "lucide-react";
import Image from "next/image";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";
import { TabInfoHelp } from "@/components/projects/TabInfoHelp";
import { useQueryClient } from "@tanstack/react-query";
import { projectKeys } from "@/lib/queryKeys";
import { perfTracker } from "@/lib/performance/measure";

interface ProjectFile {
  id: string;
  project_id: string;
  name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  category: string;
  description: string | null;
  uploaded_by: string;
  created_at: string;
  linked_task_id: string | null;
  submission_type: string;
  uploader_profile?: {
    full_name: string | null;
    username: string | null;
  };
  linked_task?: {
    id: string;
    title: string;
    status: string;
  };
}

import { useRouter, useSearchParams } from "next/navigation";

interface FilesTabProps {
  projectId: string;
  isOwnerOrMember: boolean;
  initialFiles: ProjectFile[];
}

export default function FilesTab({ projectId, isOwnerOrMember, initialFiles }: FilesTabProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [files, setFiles] = useState<ProjectFile[]>(initialFiles);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [previewingFile, setPreviewingFile] = useState<ProjectFile | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<ProjectFile["category"]>("general");
  const perfEndedRef = useRef(false);

  // Sort State from URL
  const sortField = searchParams.get('file_sort') || 'created_at';
  const sortOrder = (searchParams.get('file_order') as 'asc' | 'desc') || 'desc';

  // Watch for prop updates (e.g. from server refresh)
  useEffect(() => {
    setFiles(initialFiles);
  }, [initialFiles]);

  // Command palette deep-link: ?tab=files&upload=1 opens the Upload modal.
  useEffect(() => {
    if (searchParams.get("upload") !== "1") return;
    setShowUploadModal(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("upload");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // End the "first render" timer once the Files tab mounts and paints.
  useEffect(() => {
    if (perfEndedRef.current) return;
    perfEndedRef.current = true;
    requestAnimationFrame(() => {
      perfTracker.end("project-files-first-render", { projectId, fileCount: initialFiles.length });
    });
  }, [projectId, initialFiles.length]);

  const handleSort = (field: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (sortField === field) {
      params.set('file_order', sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      params.set('file_sort', field);
      params.set('file_order', 'desc');
    }
    router.push(`?${params.toString()}`);
  }

  const setFileParam = useCallback((fileId?: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (fileId) params.set("file", fileId);
    else params.delete("file");
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  const closePreview = useCallback(() => {
    setPreviewingFile(null);
    setFileParam(null);
  }, [setFileParam]);

  const loadFiles = useCallback(() => {
    // Realtime is handled centrally (useProjectRealtime). This forces the active files query to refetch.
    if (!projectId) return;
    queryClient.invalidateQueries({ queryKey: projectKeys.files(projectId) });
  }, [projectId, queryClient]);

  const selectedIds = useMemo(() => Array.from(selectedFiles), [selectedFiles]);

  const bulkDelete = useCallback(async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} file(s)?`)) return;
    setBulkBusy(true);
    try {
      const { error } = await supabase
        .from("project_files")
        .delete()
        .in("id", selectedIds)
        .eq("project_id", projectId);
      if (error) {
        console.error("Bulk delete files error:", error);
        alert("Failed to delete selected files.");
        return;
      }
      setSelectedFiles(new Set());
      // Optimistically update local list; realtime/query invalidation will reconcile.
      setFiles((prev) => prev.filter((f) => !selectedIds.includes(f.id)));
      loadFiles();
    } finally {
      setBulkBusy(false);
    }
  }, [projectId, selectedIds, supabase, loadFiles]);

  const bulkSetCategory = useCallback(async () => {
    if (selectedIds.length === 0) return;
    setBulkBusy(true);
    try {
      const { error } = await supabase
        .from("project_files")
        .update({ category: bulkCategory })
        .in("id", selectedIds)
        .eq("project_id", projectId);
      if (error) {
        console.error("Bulk set category error:", error);
        alert("Failed to update category for selected files.");
        return;
      }
      setSelectedFiles(new Set());
      setFiles((prev) => prev.map((f) => (selectedIds.includes(f.id) ? { ...f, category: bulkCategory } : f)));
      loadFiles();
    } finally {
      setBulkBusy(false);
    }
  }, [projectId, selectedIds, supabase, bulkCategory, loadFiles]);

  const linkSelectedToUpdate = useCallback(() => {
    if (selectedIds.length === 0) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "updates");
    params.set("newUpdate", "1");
    params.set("linkFiles", selectedIds.join(","));
    params.delete("file");
    router.push(`?${params.toString()}`);
  }, [router, searchParams, selectedIds]);

  // Deep-linking: ?tab=files&file=<id> opens preview.
  useEffect(() => {
    const fileId = searchParams.get("file");
    if (!fileId) return;
    if (previewingFile?.id === fileId) return;

    const existing = files.find((f) => f.id === fileId);
    if (existing) {
      setPreviewingFile(existing);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("project_files")
        .select("*")
        .eq("id", fileId)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data) {
        setPreviewingFile(data as any);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, files, previewingFile?.id, supabase]);

  const filteredFiles = files.filter(f => {
    if (categoryFilter !== "all" && f.category !== categoryFilter) return false;
    return true;
  });

  const sortedFilteredFiles = useMemo(() => {
    const list = [...filteredFiles];
    const dir = sortOrder === "asc" ? 1 : -1;

    list.sort((a, b) => {
      switch (sortField) {
        case "name":
          return (a.name || "").localeCompare(b.name || "") * dir;
        case "file_size":
          return ((a.file_size || 0) - (b.file_size || 0)) * dir;
        case "file_type":
          return ((a.file_type || "").localeCompare(b.file_type || "")) * dir;
        case "created_at":
        default:
          return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
      }
    });

    return list;
  }, [filteredFiles, sortField, sortOrder]);

  const filesByCategory = {
    general: files.filter(f => f.category === "general"),
    design: files.filter(f => f.category === "design"),
    code: files.filter(f => f.category === "code"),
    docs: files.filter(f => f.category === "docs"),
    media: files.filter(f => f.category === "media"),
  };

  // Task submission workflow removed; treat files as general uploads/attachments.



  if (!isOwnerOrMember) {
    return (
      <EmptyState
        icon={Lock}
        title="Access Restricted"
        description="You must be a project member to view files."
        className="py-16"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">Project Files</h2>
            <TabInfoHelp
              title="Files"
              description="Upload and organize project documents. Link files to tasks when needed."
              bullets={[
                "Use filters to find files fast",
              ]}
            />
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            {files.length} total
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Upload File
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">{files.length}</p>
              <p className="text-xs text-zinc-500">Total Files</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">{filesByCategory.design.length + filesByCategory.media.length}</p>
              <p className="text-xs text-zinc-500">Design & Media</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white dark:bg-zinc-900 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold">{filesByCategory.code.length}</p>
              <p className="text-xs text-zinc-500">Code Files</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Category Filter */}
        <div>
          <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-2">Filter by Category</p>
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: "all", label: "All Categories", count: files.length },
              { id: "general", label: "General", count: filesByCategory.general.length },
              { id: "design", label: "Design", count: filesByCategory.design.length },
              { id: "code", label: "Code", count: filesByCategory.code.length },
              { id: "docs", label: "Documents", count: filesByCategory.docs.length },
              { id: "media", label: "Media", count: filesByCategory.media.length },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors ${categoryFilter === cat.id
                  ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold"
                  : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  }`}
              >
                {cat.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${categoryFilter === cat.id
                  ? "bg-white/20 dark:bg-black/20"
                  : "bg-zinc-200 dark:bg-zinc-700"
                  }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* View Mode Toggle & Sort & Bulk Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center mb-4">
        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortField}
              onChange={(e) => handleSort(e.target.value)}
              className="appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md py-1.5 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at">Date Added</option>
              <option value="name">Name</option>
              <option value="file_size">Size</option>
              <option value="file_type">Type</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('file_order', sortOrder === 'asc' ? 'desc' : 'asc');
              router.push(`?${params.toString()}`);
            }}
            className="p-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
            title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            {sortOrder === 'asc' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode */}
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2 rounded-md transition-colors ${viewMode === "grid"
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              : "text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 rounded-md transition-colors ${viewMode === "list"
              ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              : "text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        {selectedFiles.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              {selectedFiles.size} selected
            </span>
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value as any)}
              className="px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm"
              title="Set category for selected"
              disabled={bulkBusy}
            >
              <option value="general">General</option>
              <option value="design">Design</option>
              <option value="code">Code</option>
              <option value="docs">Documents</option>
              <option value="media">Media</option>
            </select>
            <button
              onClick={bulkSetCategory}
              disabled={bulkBusy}
              className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
              title="Apply category"
            >
              Set category
            </button>
            <button
              onClick={linkSelectedToUpdate}
              disabled={bulkBusy}
              className="px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-sm font-medium hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors disabled:opacity-50"
              title="Create an update and link these files"
            >
              Link to update
            </button>
            <button
              onClick={bulkDelete}
              disabled={bulkBusy}
              className="px-3 py-1.5 rounded-md border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              {bulkBusy ? "Working..." : "Delete Selected"}
            </button>
            <button
              onClick={() => setSelectedFiles(new Set())}
              className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Files Grid */}
      {sortedFilteredFiles.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No files found"
          description={categoryFilter !== "all"
            ? "Try adjusting your filters"
            : "Upload your first file to get started"}
          actionLabel={categoryFilter === "all" ? "Upload File" : undefined}
          onAction={() => setShowUploadModal(true)}
          className="py-16 bg-white dark:bg-zinc-900"
        />
      ) : (
        <div className="h-[600px]">
          {viewMode === "grid" ? (
            <VirtuosoGrid
              style={{ height: "100%" }}
              data={sortedFilteredFiles}
              listClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              itemContent={(_index, file) => (
                <div className="p-1">
                  <FileCard
                    key={file.id}
                    file={file}
                    onDeleted={loadFiles}
                    onPreview={() => {
                      setPreviewingFile(file);
                      setFileParam(file.id);
                    }}
                    selected={selectedFiles.has(file.id)}
                    onToggleSelect={() => {
                      const newSet = new Set(selectedFiles);
                      if (newSet.has(file.id)) {
                        newSet.delete(file.id);
                      } else {
                        newSet.add(file.id);
                      }
                      setSelectedFiles(newSet);
                    }}
                    viewMode={viewMode}
                  />
                </div>
              )}
            />
          ) : (
            <Virtuoso
              style={{ height: "100%" }}
              data={sortedFilteredFiles}
              itemContent={(_, file) => (
                <div className="pb-2">
                  <FileCard
                    key={file.id}
                    file={file}
                    onDeleted={loadFiles}
                    onPreview={() => {
                      setPreviewingFile(file);
                      setFileParam(file.id);
                    }}
                    selected={selectedFiles.has(file.id)}
                    onToggleSelect={() => {
                      const newSet = new Set(selectedFiles);
                      if (newSet.has(file.id)) {
                        newSet.delete(file.id);
                      } else {
                        newSet.add(file.id);
                      }
                      setSelectedFiles(newSet);
                    }}
                    viewMode={viewMode}
                  />
                </div>
              )}
            />
          )}
        </div>
      )}

      {/* File Preview Modal */}
      {previewingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={closePreview} />
          <div className="relative z-10 w-full max-w-4xl max-h-[90vh] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{previewingFile.name}</h3>
              <button
                onClick={closePreview}
                className="p-2 rounded-md hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {previewingFile.file_type?.includes("image") ? (
                <Image
                  src={previewingFile.file_url}
                  alt={previewingFile.name}
                  width={800}
                  height={600}
                  className="max-w-full h-auto rounded-lg"
                  style={{ width: 'auto', height: 'auto' }}
                />
              ) : previewingFile.file_type?.includes("pdf") ? (
                <iframe
                  src={previewingFile.file_url}
                  className="w-full h-[600px] rounded-lg border"
                  title={previewingFile.name}
                />
              ) : (
                <div className="text-center py-16">
                  <p className="text-zinc-500">Preview not available for this file type</p>
                  <a
                    href={previewingFile.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    Download to View
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadFileModal
          projectId={projectId}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            loadFiles();
            setShowUploadModal(false);
          }}
        />
      )}
    </div>
  );
}

// File Card Component
function FileCard({
  file,
  onDeleted,
  onPreview,
  selected,
  onToggleSelect,
  viewMode = "grid",
}: {
  file: ProjectFile;
  onDeleted: () => void;
  onPreview?: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
  viewMode?: "grid" | "list";
}) {
  const supabase = createSupabaseBrowserClient();
  const [deleting, setDeleting] = useState(false);

  function getFileIcon() {
    const type = file.file_type?.toLowerCase() || "";
    if (type.includes("image")) return { path: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z", color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" };
    if (type.includes("pdf")) return { path: "M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z", color: "text-red-600 bg-red-100 dark:bg-red-900/30" };
    if (type.includes("video")) return { path: "M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z", color: "text-pink-600 bg-pink-100 dark:bg-pink-900/30" };
    return { path: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" };
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "Unknown size";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this file?")) return;
    setDeleting(true);

    const { error } = await supabase
      .from("project_files")
      .delete()
      .eq("id", file.id);

    if (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file");
      setDeleting(false);
    } else {
      onDeleted();
    }
  }

  const iconInfo = getFileIcon();

  if (viewMode === "list") {
    return (
      <div className={`rounded-lg border ${selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'} p-4 hover:shadow-md transition-all`}>
        <div className="flex items-center gap-4">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
            />
          )}
          <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${iconInfo.color} flex items-center justify-center`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconInfo.path} />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{file.name}</h4>
            <p className="text-xs text-zinc-500">{formatFileSize(file.file_size)}</p>
          </div>
          <div className="flex items-center gap-2">
            {onPreview && (
              <button
                onClick={onPreview}
                className="px-3 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
              >
                Preview
              </button>
            )}
            <a
              href={file.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Download
            </a>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 rounded-md border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors"
            >
              {deleting ? "..." : "Delete"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border-2 ${selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'} overflow-hidden shadow-sm hover:shadow-md transition-all`}>
      <div className="p-4 space-y-3">
        {/* File Icon & Name */}
        <div className="flex items-start gap-3">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={selected}
              onChange={onToggleSelect}
              className="mt-1 w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
            />
          )}
          <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${iconInfo.color} flex items-center justify-center`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconInfo.path} />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{file.name}</h4>
            <p className="text-xs text-zinc-500">{formatFileSize(file.file_size)}</p>
          </div>
        </div>

        {/* Task Link Badge */}
        {file.linked_task && (
          <div className="rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 px-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <svg className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="font-semibold text-zinc-700 dark:text-zinc-200">Linked task</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 truncate">
              {file.linked_task.title}
            </p>
          </div>
        )}

        {/* Description */}
        {file.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">{file.description}</p>
        )}

        {/* Uploader & Date */}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t">
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="truncate">{file.uploader_profile?.full_name || file.uploader_profile?.username || "User"}</span>
          </div>
          <span>{new Date(file.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center border-t-2 border-zinc-100 dark:border-zinc-800">
        {onPreview && (
          <button
            onClick={onPreview}
            className="flex-1 text-center px-4 py-2.5 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-900/50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </button>
        )}
        <a
          href={file.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${onPreview ? 'flex-1' : 'flex-1'} text-center px-4 py-2.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </a>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors border-l-2 border-zinc-100 dark:border-zinc-800"
        >
          {deleting ? "..." : "Delete"}
        </button>
      </div>
    </div>
  );
}

// Upload File Modal Component
function UploadFileModal({ projectId, onClose, onSuccess }: {
  projectId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const supabase = createSupabaseBrowserClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || submitting) {
      alert("Please select a file to upload");
      return;
    }
    setSubmitting(true);
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("You must be logged in to upload files.");
        setSubmitting(false);
        setUploading(false);
        return;
      }



      // 1. Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).slice(2);
      // Sanitize filename to avoid issues with special characters
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${sanitizedName}-${timestamp}-${randomId}.${fileExt}`;
      const filePath = `${projectId}/${user.id}/${fileName}`;



      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, selectedFile, { upsert: false });

      if (uploadError) {
        console.error("Error uploading file to storage:", JSON.stringify(uploadError, null, 2));
        alert(`Failed to upload file to storage: ${uploadError.message}`);
        setSubmitting(false);
        setUploading(false);
        return;
      }

      // 2. Get public URL
      const { data: urlData } = supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        console.error("Failed to generate public URL");
        alert("Failed to get file URL after upload.");
        setSubmitting(false);
        setUploading(false);
        return;
      }



      // 3. Create file record in database
      // Prepare the payload object to debug what is being sent
      const fileRecord = {
        project_id: projectId,
        name: selectedFile.name,
        file_url: urlData.publicUrl,
        file_size: selectedFile.size, // Ensure this is a number
        file_type: selectedFile.type || "application/octet-stream",
        // description: description || "", // REMOVED: Column missing in DB
        category: category || "general",
        // submission_type: "general", // REMOVED pending migration 0050
        uploaded_by: user.id,
      };



      const { error } = await supabase
        .from("project_files")
        .insert(fileRecord);

      if (error) {
        console.error("Error creating file record:", JSON.stringify(error, null, 2));
        // Show a more descriptive error message to the user
        let errorMsg = "Failed to save file information to database.";
        if (error.code === '42501') errorMsg += " (Permission Denied - RLS)";
        if (error.code === '23502') errorMsg += " (Missing Required Field)";
        alert(`${errorMsg}\nDetails: ${error.message}`);
      } else {

        setSelectedFile(null);
        setDescription("");
        onSuccess();
      }
    } catch (err: any) {
      console.error("Unexpected Exception during upload:", err);
      alert(`An unexpected error occurred: ${err.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative z-10 w-full max-w-lg rounded-2xl border bg-white dark:bg-zinc-900 p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold">Upload File</h3>
          <button type="button" onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>📝 Note:</strong> Upload your file directly from your computer. Files are stored securely in our cloud storage.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Select File *</label>
            <div className="relative">
              <input
                required
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFile(file);
                  }
                }}
                className="w-full px-4 py-3 rounded-lg border bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/40"
                accept="*/*"
              />
            </div>
            {selectedFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500"
            >
              <option value="general">General</option>
              <option value="design">Design</option>
              <option value="code">Code</option>
              <option value="docs">Documents</option>
              <option value="media">Media</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-lg border bg-white dark:bg-zinc-800 focus:ring-2 focus:ring-blue-500"
              placeholder="Optional description"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedFile || submitting || uploading}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white disabled:opacity-60 hover:bg-blue-700 font-semibold flex items-center gap-2"
            title={!selectedFile ? "Please select a file" : undefined}
          >
            {uploading || submitting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {uploading ? "Uploading..." : "Saving..."}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload File
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
