"use client";

import { useEffect } from "react";
import Image from "next/image";

interface PostLightboxProps {
    items: Array<{ url: string; type: 'image' | 'video' }>;
    index: number;
    onClose: () => void;
    onIndexChange: (newIndex: number) => void;
}

export default function PostLightbox({
    items,
    index,
    onClose,
    onIndexChange
}: PostLightboxProps) {
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') {
                onIndexChange((index - 1 + items.length) % items.length);
            }
            if (e.key === 'ArrowRight') {
                onIndexChange((index + 1) % items.length);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [items.length, index, onClose, onIndexChange]);

    if (!items || items.length === 0) return null;

    const currentItem = items[index];

    return (
        <div
            className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <button
                className="absolute top-4 right-4 p-2 bg-white dark:bg-zinc-900/10 hover:bg-white dark:bg-zinc-900/20 rounded-full text-white transition-colors"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                }}
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            {items.length > 1 && (
                <>
                    <button
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-zinc-900/10 hover:bg-white dark:bg-zinc-900/20 rounded-full text-white transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onIndexChange((index - 1 + items.length) % items.length);
                        }}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <button
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white dark:bg-zinc-900/10 hover:bg-white dark:bg-zinc-900/20 rounded-full text-white transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            onIndexChange((index + 1) % items.length);
                        }}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                </>
            )}
            <div className="relative w-full h-full max-w-5xl max-h-[90vh]">
                {currentItem?.type === 'video' ? (
                    <video
                        src={currentItem.url}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                ) : (
                    <Image
                        src={currentItem?.url || ''}
                        alt="Lightbox preview"
                        fill
                        className="object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                )}
            </div>
        </div>
    );
}
