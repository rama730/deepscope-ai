"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface MediaLightboxProps {
    src: string | null;
    type: 'image' | 'video';
    isOpen: boolean;
    onClose: () => void;
}

export default function MediaLightbox({ src, type, isOpen, onClose }: MediaLightboxProps) {
    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden'; // Lock scroll
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    if (!isOpen || !src) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-10"
                    onClick={onClose}
                >
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors z-[110]"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center p-4 border border-zinc-800 rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {type === 'image' ? (
                            <div className="relative w-full h-full">
                                <Image
                                    src={src}
                                    alt="Full view"
                                    fill
                                    className="object-contain"
                                    priority
                                    unoptimized
                                />
                            </div>
                        ) : (
                            <video
                                src={src}
                                className="w-full h-full object-contain max-h-[85vh]"
                                controls
                                autoPlay
                                playsInline
                            />
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
