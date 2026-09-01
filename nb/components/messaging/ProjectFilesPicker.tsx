"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Loader2, File, Image, Video, FileText, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

interface ProjectFile {
    id: string;
    name: string;
    file_url: string;
    file_size?: number;
    file_type?: string;
    category?: string;
    uploaded_by?: string;
    uploader_profile?: {
        full_name?: string;
        username?: string;
    };
    created_at: string;
}

interface ProjectFilesPickerProps {
    projectId: string;
    isOpen: boolean;
    onSelect: (files: ProjectFile[]) => void;
    onClose: () => void;
    multiple?: boolean;
}

const getFileIcon = (fileType?: string, category?: string) => {
    if (fileType?.startsWith('image/') || category === 'media') {
        return Image;
    }
    if (fileType?.startsWith('video/') || category === 'media') {
        return Video;
    }
    if (fileType === 'application/pdf' || category === 'documents') {
        return FileText;
    }
    return File;
};

export function ProjectFilesPicker({
    projectId,
    isOpen,
    onSelect,
    onClose,
    multiple = true
}: ProjectFilesPickerProps) {
    const [files, setFiles] = useState<ProjectFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && projectId) {
            loadFiles();
        } else {
            setSelectedFiles(new Set());
            setSearchQuery("");
            setCategoryFilter(null);
        }
    }, [isOpen, projectId]);

    const loadFiles = async () => {
        setLoading(true);
        try {
            const supabase = createSupabaseBrowserClient();
            let query = supabase
                .from('project_files')
                .select(`
                    id,
                    name,
                    file_url,
                    file_size,
                    file_type,
                    category,
                    uploaded_by,
                    created_at,
                    profiles:uploaded_by (
                        full_name,
                        username
                    )
                `)
                .eq('project_id', projectId)
                .order('created_at', { ascending: false })
                .limit(100);

            if (categoryFilter) {
                query = query.eq('category', categoryFilter);
            }

            const { data, error } = await query;

            if (error) {
                console.error("Error loading project files:", error);
                setFiles([]);
            } else {
                const formattedFiles: ProjectFile[] = (data || []).map((file: any) => ({
                    id: file.id,
                    name: file.name,
                    file_url: file.file_url,
                    file_size: file.file_size,
                    file_type: file.file_type,
                    category: file.category,
                    uploaded_by: file.uploaded_by,
                    uploader_profile: file.profiles ? {
                        full_name: file.profiles.full_name,
                        username: file.profiles.username
                    } : undefined,
                    created_at: file.created_at
                }));
                setFiles(formattedFiles);
            }
        } catch (error) {
            console.error("Error loading project files:", error);
            setFiles([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredFiles = files.filter(file =>
        file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const categories = Array.from(new Set(files.map(f => f.category).filter(Boolean)));

    const handleToggleFile = (fileId: string) => {
        setSelectedFiles(prev => {
            const newSet = new Set(prev);
            if (newSet.has(fileId)) {
                newSet.delete(fileId);
            } else {
                if (multiple) {
                    newSet.add(fileId);
                } else {
                    return new Set([fileId]);
                }
            }
            return newSet;
        });
    };

    const handleConfirm = () => {
        const selected = files.filter(f => selectedFiles.has(f.id));
        onSelect(selected);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold">Share from Project Files</h3>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Search and Filters */}
                    <div className="space-y-2">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search files..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                        {categories.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                                <Button
                                    variant={categoryFilter === null ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setCategoryFilter(null)}
                                >
                                    All
                                </Button>
                                {categories.map(cat => (
                                    <Button
                                        key={cat}
                                        variant={categoryFilter === cat ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => setCategoryFilter(cat as string)}
                                    >
                                        {cat}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Files List */}
                    <ScrollArea className="max-h-96">
                        {loading ? (
                            <div className="flex items-center justify-center p-8">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredFiles.length === 0 ? (
                            <div className="text-center text-sm text-muted-foreground p-8">
                                {searchQuery ? "No files found" : "No files available"}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredFiles.map((file) => {
                                    const FileIcon = getFileIcon(file.file_type, file.category);
                                    const isSelected = selectedFiles.has(file.id);
                                    const uploaderName = file.uploader_profile?.full_name ||
                                        file.uploader_profile?.username ||
                                        "Unknown";

                                    return (
                                        <button
                                            key={file.id}
                                            onClick={() => handleToggleFile(file.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 p-3 rounded-md text-left transition-colors border",
                                                isSelected
                                                    ? "bg-primary/10 border-primary"
                                                    : "hover:bg-muted border-transparent"
                                            )}
                                        >
                                            <div className={cn(
                                                "p-2 rounded-lg",
                                                isSelected ? "bg-primary/20" : "bg-muted"
                                            )}>
                                                <FileIcon className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium truncate">
                                                    {file.name}
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    {file.file_size && (
                                                        <span>{(file.file_size / 1024).toFixed(1)} KB</span>
                                                    )}
                                                    <span>•</span>
                                                    <span>{uploaderName}</span>
                                                    <span>•</span>
                                                    <span>{formatDistanceToNow(new Date(file.created_at), { addSuffix: true })}</span>
                                                </div>
                                            </div>
                                            {isSelected && (
                                                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                                    <span className="text-xs text-primary-foreground">✓</span>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <div className="p-4 border-t flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        {selectedFiles.size} {selectedFiles.size === 1 ? 'file' : 'files'} selected
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConfirm}
                            disabled={selectedFiles.size === 0}
                        >
                            Share {selectedFiles.size > 0 && `(${selectedFiles.size})`}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
