import { useEffect, useRef, useState } from 'react';

// Global map to store observers by ID to allow sharing across components
const observers = new Map<string, IntersectionObserver>();
// Map to track subscriber counts for cleanup
const subscriberCounts = new Map<string, number>();
// Global reference for the currently playing video
let activeVideoRef: HTMLVideoElement | null = null;

interface UseVideoAutoplayOptions {
    threshold?: number | number[];
    rootMargin?: string;
    autoplay?: boolean;
}

export function useVideoAutoplay(options: UseVideoAutoplayOptions = {}) {
    const { 
        threshold = 0.6, // Default: 60% visibility required to play
        rootMargin = '0px',
        autoplay = true 
    } = options;

    const elementRef = useRef<HTMLDivElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (!autoplay || typeof IntersectionObserver === 'undefined') return;

        const element = elementRef.current;
        if (!element) return;

        // Create a unique ID for this observer configuration
        // We only really support one config for now for simplicity, as most videos
        // will share the same threshold.
        const observerId = `pkg-video-autoplay-${Array.isArray(threshold) ? threshold.join('-') : threshold}-${rootMargin}`;

        let observer = observers.get(observerId);

        if (!observer) {
            observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    const videoElement = (entry.target as HTMLDivElement).querySelector('video');
                    if (!videoElement) return;

                    // Store the playing state on the element itself to avoid closure staleness issues if needed,
                    // but here we just toggle play/pause directly.
                    
                    if (entry.isIntersecting) {
                        // Singleton Play: Pause high-frequency play events
                        if (activeVideoRef && activeVideoRef !== videoElement) {
                            activeVideoRef.pause();
                        }
                        
                        activeVideoRef = videoElement;
                        videoElement.play().catch(() => {
                            // Autoplay failed
                        });
                    } else {
                        if (activeVideoRef === videoElement) {
                            videoElement.pause();
                            activeVideoRef = null;
                        } else {
                            videoElement.pause();
                        }
                    }
                });
            }, {
                threshold,
                rootMargin
            });
            observers.set(observerId, observer);
            subscriberCounts.set(observerId, 0);
        }

        // Subscribe
        observer.observe(element);
        const currentCount = subscriberCounts.get(observerId) || 0;
        subscriberCounts.set(observerId, currentCount + 1);

        // Add event listeners to the VIDEO element to sync state
        // We do this inside the effect to attach to the current video ref
        // We need to poll or check when videoRef is populated if it's dynamic
        const video = videoRef.current; // This might be null initially if render is deferred
        
        const updatePlayState = () => setIsPlaying(true);
        const updatePauseState = () => setIsPlaying(false);

        if (video) {
            video.addEventListener('play', updatePlayState);
            video.addEventListener('pause', updatePauseState);
        }

        return () => {
            if (observer && element) {
                observer.unobserve(element);
                
                // Cleanup observer if no more subscribers
                const count = subscriberCounts.get(observerId) || 0;
                if (count <= 1) {
                    observer.disconnect();
                    observers.delete(observerId);
                    subscriberCounts.delete(observerId);
                } else {
                    subscriberCounts.set(observerId, count - 1);
                }
            }

            if (video) {
                video.removeEventListener('play', updatePlayState);
                video.removeEventListener('pause', updatePauseState);
            }
        };
    }, [autoplay, threshold, rootMargin]);

    return { 
        containerRef: elementRef, 
        videoRef,
        isPlaying,
        setIsPlaying
    };
}
