"use client";


import { X, Check } from "lucide-react";
import { VideoPreview } from "@/components/explorer/VideoPreview";
import { MediaItem, UploadProgress } from "@/hooks/useComposer";

interface MediaManagerProps {
    mediaItems: MediaItem[];
    uploadProgress: Record<number, UploadProgress>;
    onRemove: (index: number) => void;
}

export function MediaManager({ mediaItems, uploadProgress, onRemove }: MediaManagerProps) {
    if (mediaItems.length === 0) return null;

    return (
        <div className={`grid gap-2 mb-4 ${mediaItems.length === 1 ? 'grid-cols-1' :
            mediaItems.length === 2 ? 'grid-cols-2' :
                'grid-cols-2 sm:grid-cols-3'
            }`}>
            {mediaItems.map((item, i) => {
                // Get progress for this specific index
                const progress = uploadProgress[i];
                const isUploading = progress && (progress.status === 'uploading' || progress.status === 'converting');
                const isCompleted = progress?.status === 'completed';
                const hasError = progress?.status === 'error';

                return (
                    <div key={i} className={`relative rounded-xl overflow-hidden group border border-zinc-200 dark:border-zinc-800 bg-black/5 ${mediaItems.length === 1 ? '' : 'aspect-square'
                        }`}>
                        {item.type === 'video' ? (
                            <VideoPreview
                                src={item.preview}
                                className={`w-full object-contain bg-black ${mediaItems.length === 1 ? 'max-h-[600px]' : 'h-full w-full object-cover'
                                    }`}
                                autoplayOnScroll={false}
                                muted={true}
                                showControls={true}
                            />
                        ) : (
                            <img
                                src={item.preview}
                                alt="Preview"
                                className={`w-full object-contain ${mediaItems.length === 1 ? 'max-h-[600px]' : 'h-full w-full object-cover'
                                    }`}
                            />
                        )}

                        {/* Upload Progress Overlay */}
                        {(isUploading || (progress && progress.progress < 100 && !isCompleted && !hasError)) && (
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 z-50">
                                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mb-3" />
                                <p className="text-white text-xs font-semibold mb-1 truncate max-w-full px-2">{item.file.name}</p>
                                <p className="text-white/80 text-[10px] mb-3 font-medium">{progress?.message || 'Uploading...'}</p>
                                <div className="w-full max-w-[120px] bg-white/10 rounded-full h-1.5 mb-2">
                                    <div
                                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                        style={{ width: `${Math.max(progress?.progress || 0, 5)}%` }}
                                    />
                                </div>
                                <p className="text-white/70 text-[10px] font-mono">{progress?.progress || 0}%</p>
                            </div>
                        )}

                        {/* Completed Indicator */}
                        {isCompleted && !isUploading && (
                            <div className="absolute top-2 left-2 px-2 py-1 bg-green-500/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider rounded-md flex items-center gap-1 z-10 shadow-lg">
                                <Check className="w-3 h-3" />
                                <span>Uploaded</span>
                            </div>
                        )}

                        {/* Error Indicator */}
                        {hasError && (
                            <div className="absolute inset-0 bg-red-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 z-50">
                                <X className="w-8 h-8 text-white mb-2 opacity-80" />
                                <p className="text-white text-sm font-bold mb-1">Upload failed</p>
                                <p className="text-white/80 text-xs text-center px-4">{progress?.message || 'Please try again'}</p>
                            </div>
                        )}

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!isUploading) onRemove(i);
                            }}
                            disabled={isUploading}
                            className={`absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm z-10 hover:bg-red-500 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
