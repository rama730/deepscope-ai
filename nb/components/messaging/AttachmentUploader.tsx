"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, Upload, File } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCSRF } from "@/hooks/useCSRF";

interface AttachmentFile {
    id: string;
    file: File;
    preview?: string;
    uploading: boolean;
    progress: number;
    error?: string;
}

interface AttachmentUploaderProps {
    onFilesReady: (files: Array<{ file_url: string; file_name: string; file_type: string; file_size: number; mime_type?: string; thumbnail_url?: string }>) => void;
    onFilesChange?: (files: AttachmentFile[]) => void;
    maxFiles?: number;
    maxSizeMB?: number;
    className?: string;
    userId?: string;
}

export function AttachmentUploader({
    onFilesReady,
    onFilesChange,
    maxFiles = 5,
    maxSizeMB = 10,
    className,
    userId
}: AttachmentUploaderProps) {
    const [files, setFiles] = useState<AttachmentFile[]>([]);
    const [dragging, setDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { token: csrfToken } = useCSRF();

    const validateFile = (file: File): string | null => {
        if (file.size > maxSizeMB * 1024 * 1024) {
            return `File size must be less than ${maxSizeMB}MB`;
        }
        return null;
    };

    const generatePreview = (file: File): Promise<string | undefined> => {
        return new Promise((resolve) => {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.onerror = () => resolve(undefined);
                reader.readAsDataURL(file);
            } else {
                resolve(undefined);
            }
        });
    };

    const handleFiles = useCallback(async (fileList: FileList) => {
        const newFiles: AttachmentFile[] = [];
        const remainingSlots = maxFiles - files.length;

        for (let i = 0; i < Math.min(fileList.length, remainingSlots); i++) {
            const file = fileList[i];
            if (!file) continue;

            const error = validateFile(file);
            if (error) {
                toast.error(error);
                continue;
            }

            const preview = await generatePreview(file);
            newFiles.push({
                id: `${Date.now()}-${Math.random()}`,
                file,
                preview,
                uploading: false,
                progress: 0
            });
        }

        const updatedFiles = [...files, ...newFiles];
        setFiles(updatedFiles);
        onFilesChange?.(updatedFiles);
    }, [files.length, maxFiles, maxSizeMB]);

    const removeFile = (id: string) => {
        const updatedFiles = files.filter(f => f.id !== id);
        setFiles(updatedFiles);
        onFilesChange?.(updatedFiles);
    };

    const uploadFiles = async (): Promise<Array<{ file_url: string; file_name: string; file_type: string; file_size: number; mime_type?: string; thumbnail_url?: string }>> => {
        const uploadedFiles: Array<{ file_url: string; file_name: string; file_type: string; file_size: number; mime_type?: string; thumbnail_url?: string }> = [];

        if (!userId) {
            toast.error('User ID required for upload');
            return [];
        }

        for (const fileData of files) {
            setFiles(prev => prev.map(f =>
                f.id === fileData.id ? { ...f, uploading: true, progress: 0 } : f
            ));

            try {
                if (!csrfToken) {
                    throw new Error('CSRF token not available. Please refresh the page.');
                }

                const formData = new FormData();
                formData.append('file', fileData.file);
                formData.append('sender_id', userId);

                const response = await fetch('/api/messages/upload', {
                    method: 'POST',
                    headers: {
                        'x-csrf-token': csrfToken
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    const errorMessage = errorData.error || `Upload failed: ${response.status} ${response.statusText}`;
                    console.error("Upload error:", errorMessage, errorData);
                    throw new Error(errorMessage);
                }

                const result = await response.json();

                if (!result.url) {
                    throw new Error('Upload succeeded but no URL returned');
                }

                // Determine file type category
                let fileType = 'file';
                if (fileData.file.type.startsWith('image/')) {
                    fileType = 'image';
                } else if (fileData.file.type.startsWith('video/')) {
                    fileType = 'video';
                } else if (fileData.file.type.startsWith('audio/')) {
                    fileType = 'audio';
                } else if (fileData.file.type === 'application/pdf') {
                    fileType = 'document';
                }

                uploadedFiles.push({
                    file_url: result.url,
                    file_name: fileData.file.name,
                    file_type: fileType,
                    file_size: fileData.file.size,
                    mime_type: fileData.file.type,
                    thumbnail_url: undefined // Prevent DB Bloat: Stop saving Base64 thumbnails
                });

                setFiles(prev => prev.map(f =>
                    f.id === fileData.id ? { ...f, uploading: false, progress: 100 } : f
                ));
            } catch (error) {
                console.error("Upload error:", error);
                setFiles(prev => prev.map(f =>
                    f.id === fileData.id ? { ...f, uploading: false, error: error instanceof Error ? error.message : 'Upload failed' } : f
                ));
                toast.error(`Failed to upload ${fileData.file.name}`);
            }
        }

        return uploadedFiles;
    };

    const handleUpload = async () => {
        const uploaded = await uploadFiles();
        if (uploaded.length > 0) {
            onFilesReady(uploaded);
            setFiles([]);
            onFilesChange?.([]);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };


    if (files.length === 0) {
        return (
            <div
                className={cn(
                    "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                    dragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                    className
                )}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files) {
                            handleFiles(e.target.files);
                        }
                    }}
                />
                <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    Drag & drop files or click to upload
                </p>
            </div>
        );
    }

    return (
        <div className={cn("space-y-2", className)}>
            <div className="grid grid-cols-2 gap-2">
                {files.map((fileData) => (
                    <div
                        key={fileData.id}
                        className="relative border rounded-lg p-2 bg-muted/50"
                    >
                        {fileData.preview ? (
                            <img
                                src={fileData.preview}
                                alt={fileData.file.name}
                                className="w-full h-24 object-cover rounded"
                            />
                        ) : (
                            <div className="w-full h-24 flex items-center justify-center bg-muted rounded">
                                <File className="h-8 w-8 text-muted-foreground" />
                            </div>
                        )}
                        <div className="mt-1 text-xs truncate">{fileData.file.name}</div>
                        {fileData.uploading && (
                            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                <div className="text-white text-xs">Uploading...</div>
                            </div>
                        )}
                        {fileData.error && (
                            <div className="absolute inset-0 bg-red-500/50 rounded-lg flex items-center justify-center">
                                <div className="text-white text-xs">{fileData.error}</div>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6"
                            onClick={() => removeFile(fileData.id)}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>
            <Button
                onClick={handleUpload}
                disabled={files.some(f => f.uploading)}
                className="w-full"
            >
                {files.some(f => f.uploading) ? "Uploading..." : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
            </Button>
        </div>
    );
}
