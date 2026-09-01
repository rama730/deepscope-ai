"use client";

import PostMediaDisplay from "@/components/post/PostMediaDisplay";
import { usePostDetail } from "@/components/post/PostDetailContext";
import { Post } from "@/components/explorer/types";

export default function PostMediaWrapper({ post }: { post: Post }) {
    const { openLightbox } = usePostDetail();

    const handleMediaClick = (clickedUrl: string, clickedType: 'image' | 'video') => {
        // Parse media items from post
        const items: Array<{ url: string; type: 'image' | 'video' }> = [];
        const media: any = (post as any)?.media;

        if (media?.type === 'image' && Array.isArray(media?.urls)) {
            media.urls.forEach((u: string) => items.push({ url: u, type: 'image' }));
        } else if (media?.type === 'video' && media?.url) {
            items.push({ url: media.url, type: 'video' });
        } else if (media?.type === 'mixed' && Array.isArray(media?.items)) {
            media.items.forEach((it: any) => {
                if (it?.url && (it?.type === 'video' || it?.type === 'image')) {
                    items.push({ url: it.url, type: it.type });
                }
            });
        } else if (media?.type === 'attachments' && Array.isArray(media?.items)) {
            media.items.forEach((it: any) => {
                if (it?.kind === 'image' && it?.url) items.push({ url: it.url, type: 'image' });
            });
        }

        if (items.length === 0) {
            openLightbox([{ url: clickedUrl, type: clickedType }], 0);
            return;
        }

        const index = Math.max(0, items.findIndex(i => i.url === clickedUrl));
        openLightbox(items, index);
    };

    return (
        <PostMediaDisplay
            post={post}
            onMediaClick={(url, type) => handleMediaClick(url, type)}
        />
    );
}
