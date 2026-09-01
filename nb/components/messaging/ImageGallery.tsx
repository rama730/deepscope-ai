"use client";

import { useState } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageAttachment } from "@/lib/services/messaging/index";

interface ImageGalleryProps {
    images: MessageAttachment[];
    isOpen: boolean;
    onClose: () => void;
    initialIndex?: number;
}

export function ImageGallery({ images, isOpen, onClose, initialIndex = 0 }: ImageGalleryProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    if (!isOpen || images.length === 0) return null;

    const safeIndex = Math.min(Math.max(currentIndex, 0), images.length - 1);
    const currentImage = images[safeIndex];
    if (!currentImage) return null;
    const hasNext = safeIndex < images.length - 1;
    const hasPrev = safeIndex > 0;

    const handleNext = () => {
        if (hasNext) {
            setCurrentIndex(safeIndex + 1);
        }
    };

    const handlePrev = () => {
        if (hasPrev) {
            setCurrentIndex(safeIndex - 1);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowRight' && hasNext) {
            handleNext();
        } else if (e.key === 'ArrowLeft' && hasPrev) {
            handlePrev();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = currentImage.file_url;
        link.download = currentImage.file_name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={onClose}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
        >
            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors"
            >
                <X className="h-6 w-6" />
            </button>

            {/* Image container */}
            <div className="relative max-w-full max-h-full p-4" onClick={(e) => e.stopPropagation()}>
                <img
                    src={currentImage.file_url}
                    alt={currentImage.file_name}
                    className="max-w-full max-h-[90vh] object-contain"
                />

                {/* Navigation */}
                {images.length > 1 && (
                    <>
                        {hasPrev && (
                            <button
                                onClick={handlePrev}
                                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                            >
                                <ChevronLeft className="h-6 w-6" />
                            </button>
                        )}
                        {hasNext && (
                            <button
                                onClick={handleNext}
                                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </button>
                        )}
                    </>
                )}

                {/* Image info and controls */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-lg flex items-center gap-4">
                    <span className="text-sm">
                        {currentIndex + 1} / {images.length}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDownload}
                        className="text-white hover:bg-white dark:bg-zinc-900/20"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                    </Button>
                </div>

                {/* Thumbnail strip */}
                {images.length > 1 && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4">
                        {images.map((img, index) => (
                            <button
                                key={img.id}
                                onClick={() => setCurrentIndex(index)}
                                className={cn(
                                    "flex-shrink-0 w-16 h-16 rounded overflow-hidden border-2 transition-all",
                                    index === currentIndex ? "border-white" : "border-transparent opacity-50 hover:opacity-75"
                                )}
                            >
                                <img
                                    src={img.thumbnail_url || img.file_url}
                                    alt={img.file_name}
                                    className="w-full h-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
