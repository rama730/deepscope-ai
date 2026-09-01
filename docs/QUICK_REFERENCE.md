# 🚀 Quick Reference Card

## Essential Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linter
```

### Database
```bash
# In Supabase SQL Editor:
\i supabase/migrations/0018_advanced_features.sql
```

---

## 📝 Component Import Reference

### Copy-Paste Imports

```tsx
// Core Components
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
import AdvancedSearch from "@/components/AdvancedSearch";
```

---

## 🎯 Common Code Snippets

### 1. Basic Post Composer

```tsx
const [content, setContent] = useState("");
const [showGifPicker, setShowGifPicker] = useState(false);

<div className="bg-white p-4 rounded-xl">
  <textarea
    value={content}
    onChange={(e) => setContent(e.target.value)}
    placeholder="What's happening?"
    className="w-full resize-none"
  />
  
  <div className="flex items-center gap-2 mt-3">
    <EmojiButton onSelect={(emoji) => setContent(content + emoji)} />
    <button onClick={() => setShowGifPicker(true)}>GIF</button>
  </div>
</div>

{showGifPicker && (
  <GifPicker
    onSelect={(url) => setGifUrl(url)}
    onClose={() => setShowGifPicker(false)}
  />
)}
```

### 2. Post Card with All Features

```tsx
<article className="bg-white border-b p-4">
  <div className="flex gap-3">
    <img src={post.profiles.avatar_url} className="w-10 h-10 rounded-full" />
    
    <div className="flex-1">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold">{post.profiles.full_name}</span>
          <span className="text-zinc-500">@{post.profiles.username}</span>
        </div>
        <PostMenu
          postId={post.id}
          userId={post.user_id}
          currentUserId={currentUser?.id}
          isOwnPost={post.user_id === currentUser?.id}
        />
      </div>
      
      {/* Content */}
      {post.content_warning ? (
        <ContentWarning warning={post.content_warning}>
          <p>{post.content}</p>
        </ContentWarning>
      ) : (
        <p>{post.content}</p>
      )}
      
      {/* Link Preview */}
      {post.link_preview && (
        <LinkPreview {...post.link_preview} />
      )}
    </div>
  </div>
</article>
```

### 3. Supabase Query Patterns

```tsx
// Basic select
const { data: posts } = await supabase
  .from("posts")
  .select("*, profiles(*)")
  .order("created_at", { ascending: false })
  .limit(50);

// With filters
const { data } = await supabase
  .from("posts")
  .select("*")
  .eq("user_id", userId)
  .gte("created_at", yesterday)
  .textSearch("search_vector", query);

// With joins
const { data } = await supabase
  .from("posts")
  .select(`
    *,
    profiles:user_id (username, full_name, avatar_url),
    link_preview:link_preview_id (*)
  `)
  .eq("id", postId)
  .single();

// Insert with return
const { data, error } = await supabase
  .from("posts")
  .insert({ content, user_id })
  .select()
  .single();
```

### 4. Realtime Subscription

```tsx
useEffect(() => {
  const channel = supabase
    .channel("posts")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "posts",
      },
      (payload) => {
        setPosts((prev) => [payload.new, ...prev]);
        setNewPostsCount((c) => c + 1);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

### 5. Keyboard Shortcuts Setup

```tsx
const { showHelp, setShowHelp } = useKeyboardShortcuts({
  onNewPost: () => setShowComposer(true),
  onSearch: () => focusSearch(),
});

return (
  <>
    {/* Your app */}
    <KeyboardShortcutsHelp
      show={showHelp}
      onClose={() => setShowHelp(false)}
    />
  </>
);
```

---

## 🗄️ Database Quick Reference

### Key Tables

```sql
-- Posts with all columns
posts (
  id, content, user_id, created_at, edited_at,
  likes_count, comments_count, reposts_count, bookmarks_count,
  media_urls, media_type, gif_url, video_thumbnail,
  content_warning, link_preview_id, post_type,
  parent_post_id, thread_root_id, is_reply, reply_count,
  quoted_post_id, is_quote, mentioned_user_ids,
  is_pinned, status, scheduled_for,
  search_vector, impressions_count
)

-- User interactions
post_likes (post_id, user_id)
post_reposts (post_id, user_id)
post_comments (post_id, user_id, content)
bookmarks (user_id, entity_id, entity_type)

-- Moderation
mutes (muter_id, muted_id)
blocks (blocker_id, blocked_id)
not_interested (user_id, post_id, reason)
post_reports (post_id, reporter_id, reason, status)

-- Features
link_previews (url, title, description, image_url)
post_edit_history (post_id, content, edited_at)
post_impressions (post_id, viewer_id, viewed_at, source)
lists (user_id, name, description, is_private)
list_members (list_id, user_id)
```

### Common Queries

```sql
-- Get feed with all relations
SELECT 
  p.*,
  profiles.username, profiles.full_name, profiles.avatar_url,
  lp.title, lp.description, lp.image_url,
  EXISTS(SELECT 1 FROM post_likes WHERE post_id = p.id AND user_id = $1) as liked,
  EXISTS(SELECT 1 FROM bookmarks WHERE entity_id = p.id AND user_id = $1) as bookmarked
FROM posts p
JOIN profiles ON p.user_id = profiles.id
LEFT JOIN link_previews lp ON p.link_preview_id = lp.id
WHERE p.user_id NOT IN (
  SELECT muted_id FROM mutes WHERE muter_id = $1
  UNION
  SELECT blocked_id FROM blocks WHERE blocker_id = $1
)
ORDER BY p.created_at DESC
LIMIT 50;

-- Full-text search
SELECT * FROM posts
WHERE search_vector @@ to_tsquery('english', $1)
ORDER BY ts_rank(search_vector, to_tsquery('english', $1)) DESC;
```

---

## 🎨 Tailwind Class Reference

### Common Patterns

```tsx
// Cards
"bg-white rounded-xl border border-zinc-200 p-4 hover:border-zinc-300"

// Buttons - Primary
"px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"

// Buttons - Secondary
"px-4 py-2 border border-zinc-300 rounded-lg hover:bg-zinc-50"

// Input
"w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"

// Modal
"fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"

// Modal Content
"bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"

// Avatar
"w-10 h-10 rounded-full"

// Icon Button
"p-2 hover:bg-zinc-100 rounded-full transition-colors"

// Badge
"px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded"
```

---

## ⚙️ Environment Variables Template

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Tenor GIF API (optional)
NEXT_PUBLIC_TENOR_API_KEY=your_tenor_key

# Google Translate (optional)
GOOGLE_TRANSLATE_API_KEY=your_google_key

# App URL (for embeds)
NEXT_PUBLIC_APP_URL=https://yourapp.com
```

---

## 🐛 Common Issues & Fixes

### 1. "relation does not exist"
```bash
# Solution: Run migrations
# In Supabase SQL Editor
\i supabase/migrations/0018_advanced_features.sql
```

### 2. RLS Policy Blocking Query
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View policies
SELECT * FROM pg_policies WHERE tablename = 'posts';
```

### 3. Media Upload Fails
```tsx
// Check storage bucket exists and has correct policies
const { data: buckets } = await supabase.storage.listBuckets();
console.log(buckets);

// Verify file path format
const path = `${userId}/videos/${filename}`;
```

### 4. Realtime Not Working
```tsx
// Ensure channel is properly set up
const channel = supabase.channel("unique-channel-name");

// Check subscription status
console.log(channel.state); // Should be "joined"
```

---

## 📊 Performance Optimization Checklist

- [ ] Enable React.StrictMode
- [ ] Use React.memo for expensive components
- [ ] Implement virtual scrolling (react-window)
- [ ] Lazy load modals and heavy components
- [ ] Optimize images with Next.js Image
- [ ] Enable Supabase connection pooling
- [ ] Add database indexes on frequently queried columns
- [ ] Implement cursor-based pagination
- [ ] Use debouncing for search and scroll
- [ ] Cache API responses

---

## 🔐 Security Checklist

- [ ] RLS enabled on all tables
- [ ] Auth checks in all API routes
- [ ] Input validation and sanitization
- [ ] Rate limiting on API endpoints
- [ ] CORS configured properly
- [ ] Environment variables secured
- [ ] SQL injection prevention (use parameterized queries)
- [ ] XSS prevention (React escapes by default)
- [ ] CSRF protection
- [ ] Secure storage bucket policies

---

## 📱 Responsive Design Breakpoints

```tsx
// Tailwind breakpoints
sm: '640px'   // Small devices
md: '768px'   // Medium devices (tablets)
lg: '1024px'  // Large devices (desktops)
xl: '1280px'  // Extra large devices
2xl: '1536px' // 2X large devices

// Usage
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
  {/* Responsive grid */}
</div>
```

---

## 🎯 Deployment Checklist

### Pre-Deployment
- [ ] Run all migrations in production
- [ ] Set all environment variables
- [ ] Test all features in staging
- [ ] Check console for errors
- [ ] Verify RLS policies
- [ ] Test on mobile devices
- [ ] Run lighthouse audit
- [ ] Check accessibility (WAVE tool)

### Post-Deployment
- [ ] Monitor error logs (Sentry/LogRocket)
- [ ] Check analytics (PostHog/Mixpanel)
- [ ] Test critical user flows
- [ ] Monitor performance (Vercel Analytics)
- [ ] Verify realtime subscriptions work
- [ ] Check API rate limits

---

## 📞 Support Resources

### Documentation
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind Docs](https://tailwindcss.com/docs)
- [React Docs](https://react.dev)

### Tools
- [Supabase Studio](https://app.supabase.com)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Postman](https://www.postman.com) - API testing
- [Chrome DevTools](https://developer.chrome.com/docs/devtools)

### Community
- [Supabase Discord](https://discord.supabase.com)
- [Next.js Discord](https://discord.gg/nextjs)
- [Tailwind Discord](https://tailwindcss.com/discord)

---

## 🎓 Learning Path

1. **Week 1**: Database & Auth
   - Supabase basics
   - RLS policies
   - User authentication

2. **Week 2**: Core Features
   - Post creation
   - Feed rendering
   - Basic interactions

3. **Week 3**: Advanced Features
   - Media uploads
   - Realtime updates
   - Search functionality

4. **Week 4**: Polish & Deploy
   - Performance optimization
   - Mobile responsiveness
   - Production deployment

---

## ⚡ Power User Tips

### 1. VS Code Snippets
Create `.vscode/snippets.json`:
```json
{
  "Supabase Select": {
    "prefix": "sbselect",
    "body": [
      "const { data } = await supabase",
      "  .from('$1')",
      "  .select('*')",
      "  .eq('$2', $3);"
    ]
  }
}
```

### 2. Custom Hooks
```tsx
// usePost.ts
export function usePost(postId: string) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadPost();
  }, [postId]);
  
  async function loadPost() {
    // Load logic
  }
  
  return { post, loading, refetch: loadPost };
}
```

### 3. Component Generator
```bash
# Create new component with template
npm run generate:component ComponentName
```

---

**Keep this reference card handy for quick lookups! 📌**


