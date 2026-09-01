"use client";

import { useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageAttachment } from "@/lib/services/messaging/index";

interface VideoPlayerProps {
    video: MessageAttachment;
    className?: string;
    autoplay?: boolean;
}

export function VideoPlayer({ video, className, autoplay = false }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(autoplay);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [progress, setProgress] = useState(0);

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleFullscreen = () => {
        if (videoRef.current) {
            if (videoRef.current.requestFullscreen) {
                videoRef.current.requestFullscreen();
            }
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = video.file_url;
        link.download = video.file_name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            if (duration > 0) {
                setProgress((current / duration) * 100);
            }
        }
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (videoRef.current) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percent = x / rect.width;
            videoRef.current.currentTime = percent * videoRef.current.duration;
        }
    };

    return (
        <div
            className={cn("relative group bg-black rounded-lg overflow-hidden", className)}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            <video
                ref={videoRef}
                src={video.file_url}
                className="w-full h-auto max-h-96"
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedMetadata={handleTimeUpdate}
                muted={isMuted}
                playsInline
            />

            {/* Thumbnail overlay (before play) */}
            {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <button
                        onClick={togglePlay}
                        className="bg-zinc-100/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-700 rounded-full p-3 transition-all backdrop-blur-sm shadow-lg group-hover:scale-110"
                    >
                        <Play className="h-5 w-5 text-zinc-900 dark:text-zinc-100 ml-0.5 fill-current" />
                    </button>
                </div>
            )}

            {/* Controls overlay */}
            {showControls && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    {/* Progress bar */}
                    <div
                        className="w-full h-1 bg-white dark:bg-zinc-900/20 rounded-full mb-2 cursor-pointer"
                        onClick={handleProgressClick}
                    >
                        <div
                            className="h-full bg-white dark:bg-zinc-900 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Control buttons */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={togglePlay}
                            className="text-white hover:bg-white dark:bg-zinc-900/20"
                        >
                            {isPlaying ? (
                                <Pause className="h-4 w-4" />
                            ) : (
                                <Play className="h-4 w-4" />
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleMute}
                            className="text-white hover:bg-white dark:bg-zinc-900/20"
                        >
                            {isMuted ? (
                                <VolumeX className="h-4 w-4" />
                            ) : (
                                <Volume2 className="h-4 w-4" />
                            )}
                        </Button>
                        <div className="flex-1" />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleDownload}
                            className="text-white hover:bg-white dark:bg-zinc-900/20"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleFullscreen}
                            className="text-white hover:bg-white dark:bg-zinc-900/20"
                        >
                            <Maximize className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
