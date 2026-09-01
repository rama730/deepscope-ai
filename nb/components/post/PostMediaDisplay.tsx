"use client";

import { Post } from "@/components/explorer/types";
import AspectRatioMedia from "@/components/explorer/AspectRatioMedia";
import Image from "next/image";
import { getOptimizedImageUrl } from "@/lib/utils/image";

interface PostMediaDisplayProps {
    post: Post;
    priority?: boolean;
    onMediaClick?: (url: string, type: 'image' | 'video', post?: Post) => void;
}

export default function PostMediaDisplay({ post, priority = false, onMediaClick }: PostMediaDisplayProps) {
    if (!post.media) return null;

    // Attachments (files + optional images)
    if (post.media?.type === 'attachments' && Array.isArray((post.media as any)?.items)) {
        const items = (post.media as any).items as Array<any>;
        const imageUrls = items
            .filter((it) => it?.kind === 'image' && typeof it?.url === 'string')
            .map((it) => it.url as string);
        const files = items.filter((it) => it?.kind === 'file' && typeof it?.url === 'string');

        return (
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                {/* Images inside attachments */}
                {imageUrls.length === 1 && (
                    <div className="relative rounded-xl overflow-hidden group border border-zinc-200 dark:border-zinc-800 bg-black/5">
                        <AspectRatioMedia
                            src={getOptimizedImageUrl(imageUrls[0] || '', 800)}
                            alt={`Post media`}
                            type="image"
                            priority={priority}
                            className="w-full object-contain cursor-pointer"
                            style={{ maxHeight: '600px' }}
                            onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (onMediaClick) onMediaClick(imageUrls[0] || '', 'image', post);
                            }}
                        />
                    </div>
                )}

                {imageUrls.length > 1 && (
                    <div className={`grid gap-2 ${imageUrls.length === 1 ? 'grid-cols-1' :
                        imageUrls.length === 2 ? 'grid-cols-2' :
                            'grid-cols-2 sm:grid-cols-3'
                        }`}>
                        {imageUrls.slice(0, 4).map((url: string, i: number) => {
                            const count = imageUrls.length;
                            return (
                                <div
                                    key={i}
                                    className={`relative rounded-xl overflow-hidden group border border-zinc-200 dark:border-zinc-800 bg-black/5 ${count === 1 ? '' : 'aspect-square'}`}
                                >
                                    <Image
                                        src={getOptimizedImageUrl(url, 600)}
                                        alt={`Post media ${i + 1}`}
                                        fill
                                        sizes="(max-width: 640px) 50vw, 200px" // More targeted sizes
                                        className="object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                        priority={priority && i === 0}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            if (onMediaClick) onMediaClick(url, 'image', post);
                                        }}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Files */}
                {files.length > 0 && (
                    <div className="p-3 space-y-2">
                        {files.map((f: any, i: number) => (
                            <a
                                key={f.url || i}
                                href={f.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-2 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800/50 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                        {f.name || 'Attachment'}
                                    </div>
                                    <div className="text-xs text-zinc-500 truncate">
                                        {f.mime || 'file'}{typeof f.size === 'number' ? ` · ${Math.round(f.size / 1024)} KB` : ''}
                                    </div>
                                </div>
                                <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                                    Open
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="mt-3">
            {/* Single Image */}
            {post.media?.type === 'image' && Array.isArray(post.media.urls) && post.media.urls.length === 1 && (
                <div className="relative rounded-xl overflow-hidden group border border-zinc-200 dark:border-zinc-800 bg-black/5">
                    <AspectRatioMedia
                        src={getOptimizedImageUrl(post.media.urls[0] || '', 800)}
                        alt="Post media"
                        type="image"
                        priority={priority}
                        className="w-full object-contain cursor-pointer"
                        style={{ maxHeight: '600px' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (onMediaClick) onMediaClick(post.media!.urls![0] || '', 'image', post);
                        }}
                    />
                </div>
            )}

            {/* Multiple Images (Grid) */}
            {post.media?.type === 'image' && Array.isArray(post.media.urls) && post.media.urls.length > 1 && (
                <div className={`grid gap-2 ${post.media.urls.length === 1 ? 'grid-cols-1' :
                    post.media.urls.length === 2 ? 'grid-cols-2' :
                        'grid-cols-2 sm:grid-cols-3'
                    }`}>
                    {post.media.urls.slice(0, 4).map((url: string, i: number) => {
                        const count = post.media!.urls!.length;

                        return (
                            <div
                                key={i}
                                className={`relative rounded-xl overflow-hidden group border border-zinc-200 dark:border-zinc-800 bg-black/5 ${count === 1 ? '' : 'aspect-square'}`}
                            >
                                <Image
                                    src={getOptimizedImageUrl(url, 600)}
                                    alt={`Post media ${i + 1}`}
                                    fill
                                    sizes="(max-width: 640px) 50vw, 300px" // Refined sizes for grid
                                    className="object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                    priority={priority && i === 0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        if (onMediaClick) onMediaClick(url, 'image', post);
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Single Video */}
            {post.media?.type === 'video' && typeof post.media.url === 'string' && (
                <div className="relative rounded-xl overflow-hidden group border border-zinc-200 dark:border-zinc-800 bg-black/5 flex items-center justify-center">
                    <AspectRatioMedia
                        src={post.media.url}
                        alt="Post video"
                        type="video"
                        priority={priority}
                        poster={post.media.metadata?.thumbnail_url || (post.media as any).thumbnail_url}
                        autoplayOnScroll={true}
                        muted={true}
                        showControls={true}
                        className="w-full object-contain"
                        style={{ maxHeight: '600px' }}
                        onClick={(e) => {
                            e.stopPropagation(); // Video players might handle clicks differently, but playing safe
                        }}
                    />
                </div>
            )}

            {/* Mixed Media */}
            {post.media?.type === 'mixed' && Array.isArray(post.media?.items) && (
                <>
                    {/* Single Mixed Item */}
                    {post.media.items.length === 1 && (
                        <div className={`relative rounded-xl overflow-hidden group border border-zinc-200 dark:border-zinc-800 bg-black/5 ${post.media.items[0].type === 'video' ? 'flex items-center justify-center' : ''}`}>
                            <AspectRatioMedia
                                src={post.media.items[0].type === 'video' ? post.media.items[0].url : getOptimizedImageUrl(post.media.items[0].url, 800)}
                                alt="Post media"
                                type={post.media.items[0].type}
                                priority={priority}
                                poster={post.media.items[0].thumbnail_url || post.media.items[0].thumbnail}
                                autoplayOnScroll={post.media.items[0].type === 'video'}
                                muted={post.media.items[0].type === 'video'}
                                showControls={post.media.items[0].type === 'video'}
                                className={`w-full object-contain`}
                                style={{ maxHeight: '600px' }}
                                onClick={(e) => {
                                    if (post.media?.items && onMediaClick) {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onMediaClick(post.media.items[0].url, post.media.items[0].type === 'video' ? 'video' : 'image', post);
                                    }
                                }}
                            />
                        </div>
                    )}

                    {/* Multiple Mixed Items */}
                    {post.media.items.length > 1 && (
                        <div className={`grid gap-2 ${post.media.items.length === 1 ? 'grid-cols-1' :
                            post.media.items.length === 2 ? 'grid-cols-2' :
                                'grid-cols-2 sm:grid-cols-3'
                            }`}>
                            {post.media.items.map((item: any, i: number) => {
                                const count = post.media!.items!.length;

                                return (
                                    <div
                                        key={i}
                                        className={`relative rounded-xl overflow-hidden group border border-zinc-200 dark:border-zinc-800 bg-black/5 ${count === 1 ? '' : 'aspect-square'} ${item.type === 'video' ? 'flex items-center justify-center' : ''}`}
                                    >
                                        {item.type === 'video' ? (
                                            <AspectRatioMedia
                                                src={item.url}
                                                alt={`Media ${i + 1}`}
                                                type={item.type}
                                                priority={priority && i === 0}
                                                poster={item.thumbnail_url || item.thumbnail}
                                                autoplayOnScroll={true}
                                                muted={true}
                                                showControls={true}
                                                className="h-full w-full object-cover cursor-pointer"
                                                style={count > 1 ? { aspectRatio: '1/1' } : undefined}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    if (onMediaClick) onMediaClick(item.url, 'video', post);
                                                }}
                                            />
                                        ) : (
                                            <Image
                                                src={getOptimizedImageUrl(item.url, 600)}
                                                alt={`Media ${i + 1}`}
                                                fill
                                                sizes="(max-width: 640px) 50vw, 200px"
                                                className="object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                                                priority={priority && i === 0}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    if (onMediaClick) onMediaClick(item.url, 'image', post);
                                                }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

