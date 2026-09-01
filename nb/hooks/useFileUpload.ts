/**
 * File upload hook with progress tracking and preview generation
 */

import { useState, useCallback, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Upload file state
 */
export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  url?: string;
  thumbnailUrl?: string;
}

/**
 * Options for file upload hook
 */
interface UseFileUploadOptions {
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize?: number;
  /** Allowed MIME types (default: images, PDFs, text, Word docs) */
  allowedTypes?: string[];
  /** Maximum number of files (default: 5) */
  maxFiles?: number;
  /** Whether to generate thumbnails for images (default: true) */
  generateThumbnails?: boolean;
  /** Storage bucket (default: attachments) */
  bucket?: string;
  /** Storage path prefix within bucket (default: message-attachments) */
  pathPrefix?: string;
  /** Callback when file upload completes */
  onUploadComplete?: (file: UploadFile) => void;
  /** Callback when file upload fails */
  onUploadError?: (file: UploadFile, error: string) => void;
}

/**
 * Return type for file upload hook
 */
interface UseFileUploadReturn {
  files: UploadFile[];
  uploading: boolean;
  addFiles: (fileList: FileList) => void;
  removeFile: (fileId: string) => void;
  retryFile: (fileId: string) => void;
  uploadFiles: () => Promise<UploadFile[]>;
  clearFiles: () => void;
  getPreviewUrl: (file: File) => Promise<string>;
}

const DEFAULT_OPTIONS: UseFileUploadOptions = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: ['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  maxFiles: 5,
  generateThumbnails: true,
  bucket: 'attachments',
  pathPrefix: 'message-attachments'
};

/**
 * Hook for file uploads with validation, progress tracking, and thumbnail generation
 * 
 * Provides complete file upload management including validation, preview generation,
 * thumbnail creation, and upload to Supabase Storage. Supports multiple files with
 * individual progress tracking.
 * 
 * @param options - Configuration options for file uploads
 * @returns Object containing files, upload state, and control functions
 * @example
 * ```tsx
 * const { files, uploading, addFiles, uploadFiles } = useFileUpload({
 *   maxFileSize: 5 * 1024 * 1024, // 5MB
 *   allowedTypes: ['image/*'],
 *   maxFiles: 3
 * });
 * ```
 */
export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const supabase = createSupabaseBrowserClient();
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // Generate preview URL for images
  const getPreviewUrl = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File is not an image'));
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Generate thumbnail for images
  const generateThumbnail = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith('image/')) {
        reject(new Error('File is not an image'));
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate thumbnail size (max 300px)
        const maxSize = 300;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(blob);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
          },
          'image/jpeg',
          0.7
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Validate file
  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (config.maxFileSize && file.size > config.maxFileSize) {
      return `File size must be less than ${(config.maxFileSize / 1024 / 1024).toFixed(1)}MB`;
    }

    // Check file type
    if (config.allowedTypes && config.allowedTypes.length > 0) {
      const isAllowed = config.allowedTypes.some(type => {
        if (type === '*/*') {
          return true;
        }
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type;
      });

      if (!isAllowed) {
        return 'File type not allowed';
      }
    }

    return null;
  }, [config.maxFileSize, config.allowedTypes]);

  // Add files to upload queue
  const addFiles = useCallback(async (fileList: FileList) => {
    const newFiles: UploadFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Check max files limit
      if (config.maxFiles && files.length + newFiles.length >= config.maxFiles) {
        break;
      }

      // Validate file
      const validationError = validateFile(file);
      if (validationError) {
        const errorFile: UploadFile = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          progress: 0,
          status: 'error',
          error: validationError
        };
        newFiles.push(errorFile);
        continue;
      }

      const uploadFile: UploadFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        progress: 0,
        status: 'pending'
      };

      // Generate preview for images
      if (file.type.startsWith('image/')) {
        try {
          uploadFile.preview = await getPreviewUrl(file);
        } catch (error) {
          logger.warn('Failed to generate preview', { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      newFiles.push(uploadFile);
    }

    setFiles(prev => [...prev, ...newFiles]);
  }, [files.length, config.maxFiles, validateFile, getPreviewUrl]);

  // Remove file from queue
  const removeFile = useCallback((fileId: string) => {
    // Cancel upload if in progress
    const controller = abortControllersRef.current.get(fileId);
    if (controller) {
      controller.abort();
      abortControllersRef.current.delete(fileId);
    }

    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Retry a failed file by moving it back to pending
  const retryFile = useCallback((fileId: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== fileId) return f;
      return { ...f, status: 'pending' as const, progress: 0, error: undefined };
    }));
  }, []);

  // Upload single file
  const uploadSingleFile = useCallback(async (uploadFile: UploadFile): Promise<UploadFile> => {
    const controller = new AbortController();
    abortControllersRef.current.set(uploadFile.id, controller);

    try {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploading' as const, progress: 0 }
          : f
      ));

      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const fileExtension = uploadFile.file.name.split('.').pop();
      const fileName = `${timestamp}_${randomId}.${fileExtension}`;
      const prefix = (config.pathPrefix || 'message-attachments').replace(/\/+$/g, '');
      const filePath = prefix ? `${prefix}/${fileName}` : fileName;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(config.bucket || 'attachments')
        .upload(filePath, uploadFile.file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(config.bucket || 'attachments')
        .getPublicUrl(filePath);

      let thumbnailUrl: string | undefined;

      // Generate and upload thumbnail for images
      if (uploadFile.file.type.startsWith('image/') && config.generateThumbnails) {
        try {
          const thumbnailDataUrl = await generateThumbnail(uploadFile.file);
          const thumbnailBlob = await fetch(thumbnailDataUrl).then(r => r.blob());
          const thumbPrefix = prefix ? `${prefix}/thumbnails` : 'thumbnails';
          const thumbnailPath = `${thumbPrefix}/${fileName}`;

          const { error: thumbnailError } = await supabase.storage
            .from(config.bucket || 'attachments')
            .upload(thumbnailPath, thumbnailBlob);

          if (!thumbnailError) {
            const { data: thumbnailUrlData } = supabase.storage
              .from(config.bucket || 'attachments')
              .getPublicUrl(thumbnailPath);
            thumbnailUrl = thumbnailUrlData.publicUrl;
          }
        } catch (thumbnailError) {
          logger.warn('Failed to generate thumbnail', { 
            error: thumbnailError instanceof Error ? thumbnailError.message : String(thumbnailError) 
          });
        }
      }

      const completedFile: UploadFile = {
        ...uploadFile,
        status: 'completed',
        progress: 100,
        url: urlData.publicUrl,
        thumbnailUrl
      };

      // Update file status
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? completedFile : f
      ));

      // Call completion callback
      if (config.onUploadComplete) {
        config.onUploadComplete(completedFile);
      }

      return completedFile;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      const errorFile: UploadFile = {
        ...uploadFile,
        status: 'error',
        error: errorMessage
      };

      // Update file status
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? errorFile : f
      ));

      // Call error callback
      if (config.onUploadError) {
        config.onUploadError(errorFile, errorMessage);
      }

      return errorFile;
    } finally {
      abortControllersRef.current.delete(uploadFile.id);
    }
  }, [supabase, config, generateThumbnail]);

  // Upload all pending files
  const uploadFiles = useCallback(async (): Promise<UploadFile[]> => {
    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      return files.filter(f => f.status === 'completed');
    }

    setUploading(true);

    try {
      const uploadPromises = pendingFiles.map(file => uploadSingleFile(file));
      const results = await Promise.all(uploadPromises);
      return results.filter(f => f.status === 'completed');
    } finally {
      setUploading(false);
    }
  }, [files, uploadSingleFile]);

  // Clear all files
  const clearFiles = useCallback(() => {
    // Cancel all uploads
    abortControllersRef.current.forEach(controller => controller.abort());
    abortControllersRef.current.clear();
    
    setFiles([]);
  }, []);

  return {
    files,
    uploading,
    addFiles,
    removeFile,
    retryFile,
    uploadFiles,
    clearFiles,
    getPreviewUrl
  };
}
