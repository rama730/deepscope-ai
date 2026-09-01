"use client";

import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Play, Pause, Volume2, VolumeX, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useVideoAutoplay } from "@/hooks/useIntersectionObserver";

interface AspectRatioMediaProps {
  src: string;
  alt: string;
  type: 'image' | 'video';
  className?: string;
  priority?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onLoad?: () => void;
  poster?: string;
  autoplayOnScroll?: boolean;
  muted?: boolean;
  showControls?: boolean;
  enableGlow?: boolean;
  enableBlurBackground?: boolean;
  style?: React.CSSProperties;
}

export default function AspectRatioMedia({
  src,
  alt,
  type,
  className = "",
  priority = false,
  onClick,
  onLoad,
  poster,
  autoplayOnScroll = true,
  muted: initialMuted = true,
  showControls = true,
  enableGlow = false,
  enableBlurBackground = false,
  style
}: AspectRatioMediaProps) {
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const imageRef = useRef<HTMLImageElement>(null);

  // Use our new shared observer hook
  const { containerRef, videoRef, isPlaying, setIsPlaying } = useVideoAutoplay({
    autoplay: autoplayOnScroll && type === 'video',
    threshold: 0.6
  });

  // Handle image load to capture aspect ratio
  const handleImageLoad = (e: any) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight) {
      setAspectRatio(naturalWidth / naturalHeight);
    }
    setIsLoading(false);
    onLoad?.();
  };

  // Video control functions
  const togglePlayPause = useCallback(() => {
    if (type !== 'video' || !videoRef.current) return;
    const video = videoRef.current;

    if (!video.paused) {
      video.pause();
    } else {
      video.play().catch((err) => {
        console.error('Play failed:', err);
        setHasError(true);
      });
    }
  }, [type, videoRef]);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (type !== 'video' || !videoRef.current) return;
    const video = videoRef.current;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [type, isMuted, videoRef]);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (type !== 'video' || !videoRef.current) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.min(Math.max(x / rect.width, 0), 1);
    const newTime = percentage * duration;

    videoRef.current.currentTime = newTime;
    setProgress(newTime);
  };

  // Render images
  if (type === 'image') {
    return (
      <div className="relative group/media overflow-hidden rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
        {/* Advanced Placeholder / Blurred background during load */}
        {isLoading && (
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-zinc-100 dark:bg-zinc-900 animate-pulse" />

            {/* Shimmer overlay */}
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />

            {/* Show a tiny, heavily blurred version of the actual image if possible as a 'thumb' placeholder */}
            <Image
              src={src}
              alt=""
              fill
              className="blur-2xl opacity-40 scale-105 object-cover"
              quality={1}
            />
          </div>
        )}

        {/* Blur Background (optional feature) */}
        {enableBlurBackground && !isLoading && (
          <Image
            src={src}
            alt=""
            fill
            className="blur-xl opacity-50 scale-110 object-cover"
            quality={20}
          />
        )}

        {/* Ambient Glow */}
        {enableGlow && !isLoading && !enableBlurBackground && (
          <>
            <Image
              src={src}
              alt=""
              fill
              className="blur-3xl opacity-20 dark:opacity-30 scale-105 object-cover"
              quality={10}
            />
          </>
        )}

        <div
          ref={containerRef}
          className={cn(
            "relative w-full z-10 transition-all duration-500",
            isLoading ? "opacity-0 invisible" : "opacity-100 visible",
            className
          )}
          style={{
            aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
            minHeight: isLoading ? '200px' : undefined,
            maxHeight: '700px', // Increased max height slightly for better vertical media
            maxWidth: '100%',
            ...style,
          }}
        >
          <Image
            ref={imageRef as any}
            src={src}
            alt={alt}
            fill
            unoptimized={true}
            priority={priority}
            onClick={onClick}
            className="object-contain"
            onLoad={handleImageLoad}
            onError={(e) => {
              console.error("Image load error:", src, e);
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </div>
      </div>
    );
  }

  // Render videos
  if (type === 'video') {
    // Error state
    if (hasError && !isLoading) {
      return (
        <div
          className={`relative w-full ${className} flex items-center justify-center bg-zinc-900 text-white rounded-lg overflow-hidden`}
          style={{
            aspectRatio: aspectRatio ? `${aspectRatio}` : '16/9',
            minHeight: '200px',
          }}
        >
          <div className="text-center p-8">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <p className="text-sm font-medium">{errorMessage || 'Video not supported'}</p>
          </div>
        </div>
      );
    }

    // Video player
    return (
      <div className="relative group/media overflow-hidden">
        {/* Blur Background */}
        {enableBlurBackground && !isLoading && (
          <div className="absolute inset-0 overflow-hidden">
            <video
              src={src}
              className="w-full h-full object-cover blur-xl opacity-50 scale-110"
              muted
              loop
              playsInline
            />
          </div>
        )}

        {/* Ambient Glow */}
        {enableGlow && !isLoading && !enableBlurBackground && (
          <div
            className="absolute inset-0 bg-black blur-3xl opacity-40 scale-105"
          />
        )}

        <div
          ref={containerRef}
          className={cn("relative w-full z-10", className)}
          style={{
            // Use raw aspect ratio without limitation
            aspectRatio: aspectRatio ? `${aspectRatio}` : undefined,
            minHeight: isLoading ? '200px' : undefined,
            maxHeight: '600px',
            maxWidth: '100%',
            ...style,
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={(e) => {
            if (onClick) {
              onClick(e);
            } else {
              togglePlayPause();
            }
          }}
        >
          <video
            ref={videoRef}
            src={src}
            poster={poster}
            className="w-full h-full object-contain bg-transparent"
            muted={isMuted}
            loop
            playsInline
            // We handle custom controls
            controls={false}
            preload="metadata"
            crossOrigin="anonymous"
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              setIsLoading(false);
              setHasError(false);
              if (video.duration && !isNaN(video.duration)) {
                setDuration(video.duration);
              }
              if (video.videoWidth && video.videoHeight) {
                setAspectRatio(video.videoWidth / video.videoHeight);
              }
            }}
            onCanPlay={(e) => {
              const video = e.currentTarget;
              setIsLoading(false);
              setHasError(false);
              if (video.duration && !isNaN(video.duration)) {
                setDuration(video.duration);
              }
            }}
            onTimeUpdate={(e) => {
              const video = e.currentTarget;
              if (!isNaN(video.currentTime) && video.currentTime >= 0) {
                setProgress(video.currentTime);
              }
            }}
            onPlay={() => {
              setIsPlaying(true);
              setShowPlayButton(false);
            }}
            onPause={() => {
              setIsPlaying(false);
              setShowPlayButton(true);
            }}
            onEnded={() => {
              setIsPlaying(false);
              setShowPlayButton(true);
            }}
            onError={(e) => {
              const video = e.currentTarget;
              setTimeout(() => {
                if (video.error) {
                  setIsLoading(false);
                  setHasError(true);
                  setErrorMessage('Video failed to load.');
                }
              }, 3000);
            }}
          />

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/50">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Big Play Button Overlay */}
          <AnimatePresence>
            {showPlayButton && !isLoading && !hasError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none"
              >
                <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-auto cursor-pointer hover:bg-black/70 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlayPause();
                  }}
                >
                  <Play className="w-6 h-6 text-white ml-1 fill-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Custom Controls Bar */}
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 flex items-end gap-3 z-30",
              showControls && isHovered ? "opacity-100" : "opacity-0"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={togglePlayPause}
              className="text-white hover:text-blue-400 transition-colors"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Progress Bar */}
            <div
              className="flex-1 h-1.5 bg-white/30 rounded-full cursor-pointer relative group/progress overflow-hidden"
              onClick={handleSeek}
            >
              <div
                className="absolute top-0 left-0 h-full bg-blue-500 rounded-full"
                style={{ width: duration > 0 ? `${(progress / duration) * 100}%` : '0%' }}
              />
            </div>

            <span className="text-xs text-white/80 font-medium font-mono">
              {formatTime(progress)} / {formatTime(duration)}
            </span>

            <button
              onClick={toggleMute}
              className="text-white hover:text-blue-400 transition-colors"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function formatTime(seconds: number) {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
