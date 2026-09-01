"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, AlertCircle } from 'lucide-react';

interface VideoPreviewProps {
    src: string;
    className?: string;
    autoplayOnScroll?: boolean;
    muted?: boolean;
    showControls?: boolean;
}

export const VideoPreview = ({
    src,
    className = '',
    autoplayOnScroll = true,
    muted: initialMuted = true,
    showControls = true
}: VideoPreviewProps) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(initialMuted);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showPlayButton, setShowPlayButton] = useState(true);

    // Intersection Observer for autoplay on scroll (Twitter-like behavior)
    useEffect(() => {
        if (!autoplayOnScroll || !videoRef.current || !containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    const video = videoRef.current;
                    if (!video) return;

                    if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
                        // Video is in view - play it
                        video.play().catch((err) => {
                            console.error('Autoplay failed:', err);
                            // Autoplay might be blocked by browser, that's okay
                        });
                        setIsPlaying(true);
                        setShowPlayButton(false);
                    } else {
                        // Video is out of view - pause it
                        video.pause();
                        setIsPlaying(false);
                        setShowPlayButton(true);
                    }
                });
            },
            {
                threshold: [0, 0.5, 1],
                rootMargin: '0px'
            }
        );

        observer.observe(containerRef.current);

        return () => {
            observer.disconnect();
        };
    }, [autoplayOnScroll, src]);

    // Simple video event handling
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoaded = () => {
            setIsLoading(false);
            setHasError(false);
            setErrorMessage(null);
        };

        const handleError = () => {
            // For blob URLs (previews), handle errors gracefully
            // They might fail to load but the actual video will work after upload
            if (src.startsWith('blob:')) {
                // For blob previews, set a flag but don't show aggressive error
                setTimeout(() => {
                    const video = videoRef.current;
                    if (!video) return;

                    // If blob video fails, just show a placeholder
                    if (video.error) {
                        setIsLoading(false);
                        setHasError(true); // Set error flag but we'll show placeholder instead of error message
                        setErrorMessage('Preview unavailable - video will display after posting');
                    }
                }, 2000);
                return; // Don't process blob URL errors further
            }

            // For uploaded videos (non-blob URLs), show proper error handling
            setTimeout(() => {
                const video = videoRef.current;
                if (!video) return;

                // Only show error if video definitely failed to load
                if (video.error) {
                    // Check specific error codes
                    if (video.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                        setIsLoading(false);
                        setHasError(true);
                        setErrorMessage('Video format not supported by your browser');
                    } else if (video.error.code === MediaError.MEDIA_ERR_NETWORK && video.readyState === 0) {
                        setIsLoading(false);
                        setHasError(true);
                        setErrorMessage('Network error loading video');
                    } else if (video.readyState === 0 && video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
                        setIsLoading(false);
                        setHasError(true);
                        setErrorMessage('Video format not supported by your browser');
                    }
                    // If video.error exists but readyState > 0, it might still be loading - don't show error
                }
            }, 4000); // Increased timeout to give video more time to load
        };

        const handlePlay = () => {
            setIsPlaying(true);
            setShowPlayButton(false);
        };

        const handlePause = () => {
            setIsPlaying(false);
            setShowPlayButton(true);
        };

        video.addEventListener('loadeddata', handleLoaded);
        video.addEventListener('canplay', handleLoaded);
        video.addEventListener('error', handleError);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);

        return () => {
            video.removeEventListener('loadeddata', handleLoaded);
            video.removeEventListener('canplay', handleLoaded);
            video.removeEventListener('error', handleError);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, [src]);

    const togglePlayPause = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
        } else {
            video.play().catch((err) => {
                console.error('Play failed:', err);
                setHasError(true);
                setErrorMessage('Failed to play video');
            });
        }
    }, [isPlaying]);

    const toggleMute = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        const video = videoRef.current;
        if (!video) return;

        video.muted = !isMuted;
        setIsMuted(!isMuted);
    }, [isMuted]);

    // Validate video URL format
    const isValidVideoUrl = (url: string): boolean => {
        if (!url) return false;
        // Accept blob URLs (for previews), HTTP/HTTPS URLs (for uploaded videos), and data URLs
        try {
            // For blob URLs, check if they're still valid
            if (url.startsWith('blob:')) {
                // Blob URLs are valid if they start with blob:
                return true;
            }
            return url.startsWith('http://') ||
                url.startsWith('https://') ||
                url.startsWith('data:');
        } catch {
            return false;
        }
    };

    if (!isValidVideoUrl(src)) {
        return (
            <div className={`${className} flex items-center justify-center bg-zinc-900 text-white relative`}>
                <div className="text-center p-8">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                    <p className="text-sm font-medium">Invalid video URL</p>
                    <p className="text-xs text-zinc-400 mt-2">Please check the video file format</p>
                </div>
            </div>
        );
    }

    // For blob URLs (previews), don't show error - just show a placeholder
    // The actual video will work after upload
    if (hasError && !isLoading && !src.startsWith('blob:')) {
        const isQuickTime = src.toLowerCase().includes('.mov') || src.toLowerCase().includes('.qt');
        return (
            <div className={`${className} flex items-center justify-center bg-zinc-900 text-white relative`}>
                <div className="text-center p-8">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
                    <p className="text-sm font-medium">{errorMessage || 'Video not supported'}</p>
                    {isQuickTime ? (
                        <div className="mt-4 space-y-2">
                            <p className="text-xs text-amber-400 font-medium">QuickTime (.mov) format detected</p>
                            <p className="text-xs text-zinc-400">QuickTime videos may not be supported by all browsers. For best compatibility, please convert your video to MP4 format.</p>
                            <p className="text-xs text-zinc-500 mt-2">You can use tools like HandBrake or online converters to convert MOV to MP4.</p>
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-400 mt-2">Supported formats: MP4, WebM, OGG, MOV, AVI, HEVC, H.264, MKV, M4V</p>
                    )}
                </div>
            </div>
        );
    }

    // For blob URLs that fail, show a simple placeholder instead of error
    if (hasError && !isLoading && src.startsWith('blob:')) {
        return (
            <div className={`${className} flex items-center justify-center bg-zinc-900 text-white relative`}>
                <div className="text-center p-4">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-zinc-800 flex items-center justify-center">
                        <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-zinc-300">Video preview</p>
                    <p className="text-xs text-zinc-500 mt-1">Will display after posting</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`relative ${className} bg-black group`}
            onClick={togglePlayPause}
        >
            <video
                ref={videoRef}
                src={src}
                className="w-full h-full object-contain"
                muted={isMuted}
                loop
                playsInline
                controls={false}
                preload="auto"
                crossOrigin="anonymous"
                onError={(e) => {
                    // Only log errors for non-blob URLs (uploaded videos)
                    // Blob URLs in previews can fail silently - the actual video will work after upload
                    if (!src.startsWith('blob:')) {
                        const video = e.currentTarget;
                        const error = video.error;
                        if (error) {
                            let errorMsg = 'Unknown error';
                            if (error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
                                errorMsg = 'Video format not supported. QuickTime (.mov) files may not be supported by all browsers. Please convert to MP4 format.';
                            } else if (error.code === MediaError.MEDIA_ERR_NETWORK) {
                                errorMsg = 'Network error loading video';
                            } else if (error.code === MediaError.MEDIA_ERR_DECODE) {
                                errorMsg = 'Video decoding error. The file may be corrupted or in an unsupported format.';
                            }
                            console.error('Video error:', errorMsg, 'Code:', error.code, 'Video src:', src);
                            setHasError(true);
                            setErrorMessage(errorMsg);
                        }
                    }
                }}
            />

            {/* Loading indicator */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
                    <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
            )}

            {/* Play/Pause overlay button */}
            {showPlayButton && !isLoading && !hasError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors cursor-pointer">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            togglePlayPause();
                        }}
                        className="w-16 h-16 rounded-full bg-white dark:bg-zinc-900/90 hover:bg-white dark:bg-zinc-900 flex items-center justify-center transition-all transform hover:scale-110 shadow-lg"
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? (
                            <Pause className="w-8 h-8 text-zinc-900 dark:text-zinc-50 ml-1" fill="currentColor" />
                        ) : (
                            <Play className="w-8 h-8 text-zinc-900 dark:text-zinc-50 ml-1" fill="currentColor" />
                        )}
                    </button>
                </div>
            )}

            {/* Mute/Unmute button */}
            {showControls && !isLoading && !hasError && (
                <button
                    onClick={toggleMute}
                    className="absolute bottom-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-all backdrop-blur-sm"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? (
                        <VolumeX className="w-5 h-5" />
                    ) : (
                        <Volume2 className="w-5 h-5" />
                    )}
                </button>
            )}
        </div>
    );
};
