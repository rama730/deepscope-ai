"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import PostLightbox from "@/components/post/PostLightbox";

interface LightboxState {
    items: Array<{ url: string; type: 'image' | 'video' }>;
    index: number;
}

interface PostDetailContextType {
    openLightbox: (items: Array<{ url: string; type: 'image' | 'video' }>, index: number) => void;
    replyTargetId: string | null;
    setReplyTargetId: (id: string | null) => void;
}

const PostDetailContext = createContext<PostDetailContextType | undefined>(undefined);

export function PostDetailProvider({ children }: { children: ReactNode }) {
    const [lightbox, setLightbox] = useState<LightboxState | null>(null);
    const [replyTargetId, setReplyTargetId] = useState<string | null>(null);

    const openLightbox = (items: Array<{ url: string; type: 'image' | 'video' }>, index: number) => {
        setLightbox({ items, index });
    };

    return (
        <PostDetailContext.Provider value={{ openLightbox, replyTargetId, setReplyTargetId }}>
            {children}
            {lightbox && (
                <PostLightbox
                    items={lightbox.items}
                    index={lightbox.index}
                    onClose={() => setLightbox(null)}
                    onIndexChange={(i) => setLightbox(prev => prev ? { ...prev, index: i } : prev)}
                />
            )}
        </PostDetailContext.Provider>
    );
}

export function usePostDetail() {
    const context = useContext(PostDetailContext);
    if (context === undefined) {
        throw new Error("usePostDetail must be used within a PostDetailProvider");
    }
    return context;
}
