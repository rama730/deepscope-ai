# Quick Integration Guide

## 🚀 How to Add All Advanced Features to Your Explorer

Follow these steps to integrate all the new features into your Explorer page.

---

## Step 1: Run Database Migrations

```bash
# In Supabase SQL Editor, run:
# 1. Navigate to SQL Editor
# 2. Run the migration file:
```

```sql
\i supabase/migrations/0018_advanced_features.sql
```

Or copy-paste the entire contents of `0018_advanced_features.sql` into the SQL Editor.

---

## Step 2: Set Environment Variables

Create or update your `.env.local` file:

```env
# Required for GIF Picker
NEXT_PUBLIC_TENOR_API_KEY=your_tenor_api_key_here

# Required for Translation (optional, degrades gracefully)
GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key_here
```

**Get API Keys:**
- **Tenor API**: https://developers.google.com/tenor/guides/quickstart
- **Google Translate**: https://cloud.google.com/translate/docs/setup

---

## Step 3: Update Explorer Imports

Add these imports to `app/(main)/explorer/page.tsx`:

```tsx
// Add to existing imports
import VideoUploader from "@/components/VideoUploader";
import GifPicker from "@/components/GifPicker";
import LinkPreview from "@/components/LinkPreview";
import EditHistoryModal from "@/components/EditHistoryModal";
import PostMenu from "@/components/PostMenu";
import PostAnalyticsModal from "@/components/PostAnalyticsModal";
import ThreadComposer from "@/components/ThreadComposer";
import { EmojiButton } from "@/components/EmojiPicker";
import ContentWarning, { ContentWarningComposer } from "@/components/ContentWarning";
import { useKeyboardShortcuts, KeyboardShortcutsHelp } from "@/components/KeyboardShortcuts";
```

---

## Step 4: Add State Variables

Add these to your Explorer component state:

```tsx
// Media & GIF states
const [showGifPicker, setShowGifPicker] = useState(false);
const [showVideoUploader, setShowVideoUploader] = useState(false);
const [mediaUrls, setMediaUrls] = useState<string[]>([]);
const [gifUrl, setGifUrl] = useState<string | null>(null);

// Content warning
const [contentWarning, setContentWarning] = useState("");

// Modals
const [showThreadComposer, setShowThreadComposer] = useState(false);
const [editHistoryPostId, setEditHistoryPostId] = useState<string | null>(null);
const [analyticsPostId, setAnalyticsPostId] = useState<string | null>(null);

// Keyboard shortcuts
const { showHelp, setShowHelp } = useKeyboardShortcuts({
  onNewPost: () => {
    setComposerExpanded(true);
    // Focus textarea
  },
  onSearch: () => {
    // Focus search if you add it
  },
});

// Feed sorting
const [sortBy, setSortBy] = useState<'latest' | 'top' | 'trending'>('latest');
```

---

## Step 5: Update Post Composer

Replace your current composer action buttons with:

```tsx
{/* Composer Action Buttons */}
<div className="flex items-center gap-1 pt-3 border-t border-zinc-200">
  {/* Emoji Picker */}
  <EmojiButton onSelect={(emoji) => setContent(content + emoji)} />
  
  {/* GIF Button */}
  <button
    type="button"
    onClick={() => setShowGifPicker(true)}
    className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
    title="Add GIF"
  >
    <Film className="w-5 h-5 text-zinc-600" />
  </button>
  
  {/* Video Upload Button */}
  <button
    type="button"
    onClick={() => setShowVideoUploader(true)}
    className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
    title="Upload Video"
  >
    <Video className="w-5 h-5 text-zinc-600" />
  </button>
  
  {/* Thread Button */}
  <button
    type="button"
    onClick={() => setShowThreadComposer(true)}
    className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
    title="Create Thread"
  >
    <MessageSquare className="w-5 h-5 text-zinc-600" />
  </button>
</div>

{/* Content Warning */}
{composerExpanded && (
  <ContentWarningComposer
    value={contentWarning}
    onChange={setContentWarning}
  />
)}

{/* Video Uploader */}
{showVideoUploader && (
  <VideoUploader
    onUpload={(url, thumbnail) => {
      setMediaUrls([...mediaUrls, url]);
      setShowVideoUploader(false);
    }}
    onRemove={() => setShowVideoUploader(false)}
  />
)}

{/* GIF Picker */}
{showGifPicker && (
  <GifPicker
    onSelect={(url) => {
      setGifUrl(url);
      setShowGifPicker(false);
    }}
    onClose={() => setShowGifPicker(false)}
  />
)}
```

---

## Step 6: Update handlePost Function

Modify your `handlePost` function to include new fields:

```tsx
async function handlePost(e: React.FormEvent) {
  e.preventDefault();
  if (!content.trim() || !currentUser) return;

  // Detect URLs for link preview
  let linkPreviewId = null;
  const urlMatch = content.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    const response = await fetch(`/api/unfurl?url=${encodeURIComponent(urlMatch[0])}`);
    if (response.ok) {
      const preview = await response.json();
      linkPreviewId = preview.id;
    }
  }

  const { error } = await supabase.from("posts").insert({
    content: content.trim(),
    user_id: currentUser.id,
    media_urls: mediaUrls.length > 0 ? mediaUrls : gifUrl ? [gifUrl] : null,
    media_type: gifUrl ? 'gif' : mediaUrls.length > 0 ? 'video' : null,
    gif_url: gifUrl,
    content_warning: contentWarning || null,
    link_preview_id: linkPreviewId,
  });

  if (!error) {
    setContent("");
    setMediaUrls([]);
    setGifUrl(null);
    setContentWarning("");
    clearDraft();
    loadPosts();
    setShowPostedPill(true);
    setTimeout(() => setShowPostedPill(false), 3000);
  }
}
```

---

## Step 7: Update Post Card Rendering

Replace your post rendering with this enhanced version:

```tsx
{posts.map((post) => (
  <article
    key={post.id}
    onClick={() => router.push(`/post/${post.id}`)}
    className="bg-white border-b border-zinc-200 p-4 hover:bg-zinc-50 transition-colors cursor-pointer"
  >
    {/* Repost Header (if applicable) */}
    {post.is_repost && (
      <div className="text-sm text-zinc-500 mb-2 flex items-center gap-1">
        <Repeat2 className="w-4 h-4" />
        <span>Reposted by @{currentUser?.username}</span>
      </div>
    )}

    <div className="flex gap-3">
      {/* Avatar */}
      <Link
        href={`/profile/${post.user_id}`}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={post.profiles.avatar_url || "/default-avatar.png"}
          alt=""
          className="w-10 h-10 rounded-full"
        />
      </Link>

      <div className="flex-1">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/profile/${post.user_id}`}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-zinc-900 hover:underline"
            >
              {post.profiles.full_name}
            </Link>
            <span className="text-zinc-500">@{post.profiles.username}</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-500 text-sm">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
            {post.edited_at && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditHistoryPostId(post.id);
                }}
                className="text-xs text-zinc-500 hover:underline"
              >
                (edited)
              </button>
            )}
          </div>

          {/* Post Menu */}
          <PostMenu
            postId={post.id}
            userId={post.user_id}
            currentUserId={currentUser?.id}
            isOwnPost={post.user_id === currentUser?.id}
            isPinned={post.is_pinned}
            onEdit={() => startEditPost(post)}
            onDelete={() => deletePost(post.id)}
            onPin={() => togglePin(post.id)}
            onViewAnalytics={() => setAnalyticsPostId(post.id)}
            onViewEditHistory={() => setEditHistoryPostId(post.id)}
          />
        </div>

        {/* Content with Content Warning */}
        {post.content_warning ? (
          <ContentWarning warning={post.content_warning}>
            <PostContent post={post} />
          </ContentWarning>
        ) : (
          <PostContent post={post} />
        )}

        {/* Link Preview */}
        {post.link_preview_id && post.link_preview && (
          <LinkPreview
            url={post.link_preview.url}
            title={post.link_preview.title}
            description={post.link_preview.description}
            imageUrl={post.link_preview.image_url}
            siteName={post.link_preview.site_name}
            faviconUrl={post.link_preview.favicon_url}
          />
        )}

        {/* Engagement Buttons */}
        {/* ... your existing like, comment, repost buttons ... */}
      </div>
    </div>
  </article>
))}
```

---

## Step 8: Add Modals at Bottom of Component

Add these modals before the closing `</div>` of your Explorer component:

```tsx
{/* Thread Composer */}
{showThreadComposer && (
  <ThreadComposer
    onClose={() => setShowThreadComposer(false)}
    onPublish={() => {
      setShowThreadComposer(false);
      loadPosts();
    }}
  />
)}

{/* Edit History Modal */}
{editHistoryPostId && (
  <EditHistoryModal
    postId={editHistoryPostId}
    onClose={() => setEditHistoryPostId(null)}
  />
)}

{/* Analytics Modal */}
{analyticsPostId && (
  <PostAnalyticsModal
    postId={analyticsPostId}
    onClose={() => setAnalyticsPostId(null)}
  />
)}

{/* Keyboard Shortcuts Help */}
<KeyboardShortcutsHelp
  show={showHelp}
  onClose={() => setShowHelp(false)}
/>
```

---

## Step 9: Add Feed Sorting UI

Add this sorting dropdown above your feed:

```tsx
<div className="bg-white border-b border-zinc-200 p-3">
  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value as any)}
    className="px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    <option value="latest">Latest</option>
    <option value="top">Top Posts</option>
    <option value="trending">Trending</option>
  </select>
</div>
```

Update `loadPosts` to use the sort:

```tsx
let query = supabase.from("posts").select(/* ... */);

switch (sortBy) {
  case 'top':
    query = query.order('likes_count', { ascending: false });
    break;
  case 'trending':
    query = query.order('popularity_score', { ascending: false });
    break;
  default:
    query = query.order('created_at', { ascending: false });
}
```

---

## Step 10: Add Search Page to Navigation

Update your navigation/sidebar to include:

```tsx
<Link href="/search">
  <Search className="w-5 h-5" />
  Advanced Search
</Link>

<Link href="/lists">
  <Users className="w-5 h-5" />
  Lists
</Link>
```

Create the search page at `app/(main)/search/page.tsx`:

```tsx
import AdvancedSearch from '@/components/AdvancedSearch';

export default function SearchPage() {
  return <AdvancedSearch />;
}
```

---

## Step 11: Update Post Interface

Add these fields to your `Post` interface:

```tsx
interface Post {
  // ... existing fields ...
  media_urls?: string[];
  media_type?: string;
  gif_url?: string;
  content_warning?: string;
  link_preview_id?: string;
  link_preview?: {
    url: string;
    title: string;
    description: string;
    image_url: string;
    site_name: string;
    favicon_url: string;
  };
  edited_at?: string;
  is_pinned?: boolean;
  is_repost?: boolean;
}
```

---

## Step 12: Test Everything!

1. ✅ Create a post with a GIF
2. ✅ Create a post with a video
3. ✅ Create a post with a URL (test link preview)
4. ✅ Add a content warning to a post
5. ✅ Edit a post and view edit history
6. ✅ Create a thread (tweetstorm)
7. ✅ View post analytics (your own post)
8. ✅ Mute/block a user
9. ✅ Use keyboard shortcuts (press `?`)
10. ✅ Create a list and add members
11. ✅ Use advanced search
12. ✅ Embed a post
13. ✅ Translate a post (if API key set)

---

## 🎉 You're Done!

Your Explorer now has **all** the advanced features implemented!

If you encounter any issues:
1. Check browser console for errors
2. Verify API keys are set
3. Ensure migrations ran successfully
4. Check Supabase logs for RLS policy issues

---

## 📱 Mobile Responsiveness

All components are mobile-responsive out of the box using Tailwind's responsive classes:
- Modals adapt to screen size
- Grid layouts collapse on mobile
- Touch-friendly button sizes

---

## 🎨 Customization

To customize styles:
1. Components use Tailwind classes
2. Primary color: `blue-600`
3. Text: `zinc-900/700/600/500`
4. Borders: `zinc-200/300`

Change the color scheme by find-replacing:
- `blue-600` → your primary color
- `zinc-` → your preferred neutral

---

## 🚀 Performance Tips

1. **Lazy load components** for modals:
```tsx
const EditHistoryModal = lazy(() => import('@/components/EditHistoryModal'));
```

2. **Debounce search** (already implemented in AdvancedSearch)

3. **Virtual scrolling** for long lists (consider react-window)

4. **Image optimization** (use Next.js Image component)

---

**Congratulations! Your app is now feature-complete! 🎊**


