"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { compressImage } from '@/lib/compression';
import { Upload } from 'tus-js-client';
// FFmpeg moved to worker
import { toast } from 'sonner';

export interface BackgroundUpload {
    id: string;
    postData: any; // The payload for the 'posts' table
    mediaItems: { file: File; type: 'image' | 'video'; preview: string }[];
    status: 'queued' | 'compressing' | 'transcoding' | 'uploading' | 'publishing' | 'completed' | 'error';
    progress: number; // 0-100
    error?: string;
    uploadedUrls: { url: string; type: 'image' | 'video' }[];
}

interface UploadContextType {
    uploads: BackgroundUpload[];
    startPost: (postData: any, mediaItems: any[]) => void;
    retryPost: (id: string) => void;
    cancelPost: (id: string) => void;
}

const UploadContext = createContext<UploadContextType | null>(null);

export function useBackgroundUpload() {
    return useContext(UploadContext)!;
}

export function UploadProvider({ children }: { children: React.ReactNode }) {
    const supabase = createSupabaseBrowserClient();
    const [uploads, setUploads] = useState<BackgroundUpload[]>([]);
    const workerRef = useRef<Worker | null>(null);
    const processingRef = useRef(false);

    // Initialize Worker
    const getWorker = () => {
        if (workerRef.current) return workerRef.current;
        const worker = new Worker(new URL('../workers/transcode.worker.ts', import.meta.url));
        worker.postMessage({ type: 'load' });
        workerRef.current = worker;
        return worker;
    };

    const startPost = (postData: any, mediaItems: any[]) => {
        const id = Math.random().toString(36).slice(2);
        const newUpload: BackgroundUpload = {
            id,
            postData,
            mediaItems,
            status: 'queued',
            progress: 0,
            uploadedUrls: []
        };
        setUploads(prev => [newUpload, ...prev]);
        processQueue();
    };

    const updateUpload = (id: string, updates: Partial<BackgroundUpload>) => {
        setUploads(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
    };

    const processQueue = async () => {
        if (processingRef.current) return;

        // Find next queued item
        // Note: This simple queue processes one post at a time to save resources (FFmpeg is heavy)
        // We could parallelize images, but video transcoding should be serial.

        // Actually, we need to grab the current state.
        // Since we are in an async function, usage of 'uploads' state might be stale.
        // Reliable way: simple lock and effect? Or just check ref.

        // For simplicity, let's just trigger a separate "process" function for specific ID
        // But we want to automate it.
    };

    // We use an effect to watch for queued items and process them
    useEffect(() => {
        const processNext = async () => {
            if (processingRef.current) return;
            const next = uploads.find(u => u.status === 'queued');
            if (!next) return;

            processingRef.current = true;
            await processUpload(next);
            processingRef.current = false;
        };
        processNext();
    }, [uploads]);

    const processUpload = async (task: BackgroundUpload) => {
        const { id, mediaItems, postData } = task;
        const currentUser = (await supabase.auth.getUser()).data.user;
        if (!currentUser) return;

        try {
            updateUpload(id, { status: 'compressing', progress: 0 });

            const processedMedia: { file: File, type: 'image' | 'video' }[] = [];

            // 1. Processing (Compress/Transcode)
            for (let i = 0; i < mediaItems.length; i++) {
                const item = mediaItems[i];
                if (!item) continue;
                let file = item.file;

                if (item.type === 'image') {
                    file = await compressImage(file);
                } else if (item.type === 'video') {
                    updateUpload(id, { status: 'transcoding', progress: (i / mediaItems.length) * 30 });
                    // Check if needs transcoding
                    const ext = file.name.split('.').pop()?.toLowerCase();
                    if (['mov', 'qt', 'avi', 'mkv'].includes(ext || '')) {
                        const worker = getWorker();
                        const uniqueTranscodeId = `${id}-${i}`;

                        await new Promise<void>((resolve, reject) => {
                            const handler = (event: MessageEvent) => {
                                const { type: msgType, id: msgId, blob, error, progress } = event.data;
                                if (msgId !== uniqueTranscodeId) return;

                                if (msgType === 'complete') {
                                    worker.removeEventListener('message', handler);
                                    file = new File([blob], file.name.replace(/\.[^.]+$/, '.mp4'), { type: 'video/mp4' });
                                    resolve();
                                } else if (msgType === 'error') {
                                    worker.removeEventListener('message', handler);
                                    reject(new Error(error));
                                } else if (msgType === 'progress') {
                                    const itemProgress = (i / mediaItems.length) * 30;
                                    const transcodeProgress = (progress / 100) * (30 / mediaItems.length);
                                    updateUpload(id, { status: 'transcoding', progress: itemProgress + transcodeProgress });
                                }
                            };
                            worker.addEventListener('message', handler);
                            worker.postMessage({ type: 'transcode', id: uniqueTranscodeId, file });
                        });
                    }
                }
                processedMedia.push({ file, type: item.type });
            }

            // 2. Uploading (TUS)
            updateUpload(id, { status: 'uploading', progress: 30 });
            const finalUrls: { url: string; type: 'image' | 'video' }[] = [];

            const { data: { session } } = await supabase.auth.getSession();
            const endpoint = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`;

            let uploadedCount = 0;

            for (const item of processedMedia) {
                const file = item.file;
                const fileExt = file.name.split('.').pop();
                const fileName = `${currentUser.id}-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
                const filePath = `${currentUser.id}/${fileName}`;

                const UPLOAD_THRESHOLD = 10 * 1024 * 1024; // 10MB

                if (file.size > UPLOAD_THRESHOLD) {
                    await new Promise<void>((resolve, reject) => {
                        const upload = new Upload(file, {
                            endpoint,
                            retryDelays: [0, 3000, 5000],
                            headers: { authorization: `Bearer ${session?.access_token}` },
                            metadata: {
                                bucketName: 'post-media',
                                objectName: filePath,
                                contentType: file.type,
                                cacheControl: '3600',
                            },
                            onError: reject,
                            onProgress: (bytesUploaded, bytesTotal) => {
                                const itemProgress = (bytesUploaded / bytesTotal);
                                const baseProgress = 30 + (uploadedCount / processedMedia.length) * 60;
                                const currentItemContribution = (60 / processedMedia.length) * itemProgress;
                                updateUpload(id, { progress: baseProgress + currentItemContribution });
                            },
                            onSuccess: resolve
                        });
                        upload.start();
                    });
                } else {
                    // Standard Upload for small files
                    const { error } = await supabase.storage
                        .from('post-media')
                        .upload(filePath, file, {
                            cacheControl: '3600',
                            upsert: false,
                        });

                    if (error) throw error;

                    // Manually update progress since upload() doesn't give fine-grained progress
                    const baseProgress = 30 + (uploadedCount / processedMedia.length) * 60;
                    const currentItemContribution = (60 / processedMedia.length); // 100% of item
                    updateUpload(id, { progress: baseProgress + currentItemContribution });
                }

                const { data } = supabase.storage.from('post-media').getPublicUrl(filePath);
                finalUrls.push({ url: data.publicUrl, type: item.type });
                uploadedCount++;
                updateUpload(id, { progress: 30 + (uploadedCount / processedMedia.length) * 60 });
            }

            // 3. Publishing
            updateUpload(id, { status: 'publishing', progress: 95 });

            // Construct Media Payload
            let mediaPayload: any = null;
            if (finalUrls.length > 0) {
                const allImages = finalUrls.every(i => i.type === 'image');
                const singleVideo = finalUrls.length === 1 && finalUrls[0].type === 'video';
                if (allImages) mediaPayload = { type: 'image', urls: finalUrls.map(i => i.url) };
                else if (singleVideo) mediaPayload = { type: 'video', url: finalUrls[0]?.url };
                else mediaPayload = { type: 'mixed', items: finalUrls };
            }

            const finalInsert = { ...postData, media: mediaPayload };
            const { data: newPost, error } = await supabase.from("posts").insert(finalInsert).select().single();
            if (error) throw error;

            // Handle Side Effects (Mentions)
            if (postData.project_id && postData.post_type === 'project_update') {
                const { error: mentionError } = await supabase.from('post_project_mentions').insert({
                    post_id: newPost.id,
                    project_id: postData.project_id
                });
                if (mentionError) console.warn("Failed to insert project mention", mentionError);
            }

            // Success
            updateUpload(id, { status: 'completed', progress: 100 });
            toast.success("Post published!");

            // Cleanup from list after delay
            setTimeout(() => {
                setUploads(prev => prev.filter(u => u.id !== id));
            }, 5000);

        } catch (e: any) {
            console.error("Background Upload Failed", e);
            updateUpload(id, { status: 'error', error: e.message });
            toast.error(`Post failed: ${e.message}`);
        }
    };

    const retryPost = (id: string) => {
        updateUpload(id, { status: 'queued', error: undefined, progress: 0 });
    };

    const cancelPost = (id: string) => {
        setUploads(prev => prev.filter(u => u.id !== id));
    };

    return (
        <UploadContext.Provider value={{ uploads, startPost, retryPost, cancelPost }}>
            {children}
            {/* Global Progress Indicator */}
            <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
                {uploads.map(u => (
                    u.status !== 'completed' && (
                        <div key={u.id} className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-3 shadow-lg w-72">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold uppercase text-zinc-500">{u.status}</span>
                                <span className="text-xs text-zinc-400">{Math.round(u.progress)}%</span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${u.progress}%` }} />
                            </div>
                            {u.error && <div className="text-red-500 text-xs mt-1">{u.error} <button onClick={() => retryPost(u.id)} className="underline ml-1">Retry</button></div>}
                        </div>
                    )
                ))}
            </div>
        </UploadContext.Provider>
    );
}
