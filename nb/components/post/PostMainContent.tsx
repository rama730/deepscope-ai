import Link from "next/link";
import AvatarWithFallback from "@/components/ui-custom/AvatarWithFallback";
import { Post } from "@/components/explorer/types";
import PostMediaWrapper from "./PostMediaWrapper";
// import PostViewTracker from "./PostViewTracker";

// Helper to format date
const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    });
};

// Simple text renderer - could be enhanced but nice for Server Component
const renderContent = (text: string | null) => {
    if (!text) return null;
    const parts = text.split(/((?:#|@)\w+)/g);
    return parts.map((part, i) => {
        if (part.startsWith('#')) {
            return <span key={i} className="text-blue-500 hover:underline cursor-pointer">{part}</span>;
        }
        if (part.startsWith('@')) return <Link key={i} href={`/profile/${part.slice(1)}`} className="text-blue-500 hover:underline">{part}</Link>;
        return part;
    });
};

interface PostMainContentProps {
    post: Post;
    children?: React.ReactNode; // For embedding the InteractionBar client component
}

export default function PostMainContent({ post, children }: PostMainContentProps) {
    function getInitialsFromName(name?: string | null) {
        return name?.charAt(0).toUpperCase() || 'U';
    }

    return (
        <article className="p-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
            {/* Header User Info */}
            <div className="flex gap-3 mb-4">
                <Link href={`/profile/${post.profiles?.username}`}>
                    <AvatarWithFallback
                        src={post.profiles?.avatar_url}
                        alt={post.profiles?.full_name || post.profiles?.username || "User"}
                        fallback={getInitialsFromName(post.profiles?.full_name)}
                        size="md"
                    />
                </Link>
                <div className="flex flex-col">
                    <Link href={`/profile/${post.profiles?.username}`} className="font-bold hover:underline block text-base text-zinc-900 dark:text-zinc-50">
                        {post.profiles?.full_name || post.profiles?.username}
                    </Link>
                    <Link href={`/profile/${post.profiles?.username}`} className="text-zinc-500 text-sm">
                        @{post.profiles?.username}
                    </Link>
                </div>
            </div>

            {/* Content Body */}
            <div className="text-xl mb-4 whitespace-pre-wrap leading-relaxed text-zinc-900 dark:text-zinc-100 font-normal">
                {renderContent(post.content)}
            </div>

            {/* Media */}
            <div className="mb-4">
                {/* PostMediaWrapper handles client-side lightbox interactions */}
                <PostMediaWrapper post={post} />
            </div>

            {/* Metadata */}
            <div className="text-zinc-500 text-sm py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                <span>{formatDate(post.created_at)}</span>
                <span>·</span>
                <span className="text-zinc-900 dark:text-zinc-100 font-semibold">{post.views_count}</span>
                <span>Views</span>
            </div>

            {/* Interaction Bar (Slot) */}
            {children}

        </article>
    );
}
