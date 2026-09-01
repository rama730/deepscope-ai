# Component Architecture

## 📐 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Explorer Page (Main Feed)                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │  Left Sidebar  │  │   Main Feed     │  │Right Sidebar │ │
│  │                │  │                 │  │              │ │
│  │ - Profile      │  │ - Post Composer │  │ - Trending   │ │
│  │ - Network      │  │ - Feed Posts    │  │ - Suggestions│ │
│  │ - Projects     │  │ - New Posts Pill│  │              │ │
│  │ - Saved        │  │ - Load More     │  │              │ │
│  └────────────────┘  └─────────────────┘  └──────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧩 Component Tree

### Main Pages

```
app/
├── (main)/
│   ├── explorer/page.tsx          🏠 Main Feed (Twitter-style)
│   │   ├── <PostComposer />
│   │   │   ├── <EmojiButton />
│   │   │   ├── <GifPicker />
│   │   │   ├── <VideoUploader />
│   │   │   └── <ContentWarningComposer />
│   │   ├── <PostCard />
│   │   │   ├── <PostMenu />
│   │   │   ├── <ContentWarning />
│   │   │   ├── <LinkPreview />
│   │   │   └── <MediaGallery />
│   │   ├── <ThreadComposer />
│   │   ├── <ReplyComposer />
│   │   ├── <QuoteComposer />
│   │   ├── <EditHistoryModal />
│   │   ├── <PostAnalyticsModal />
│   │   ├── <EngagementListModal />
│   │   └── <KeyboardShortcutsHelp />
│   │
│   ├── post/[id]/page.tsx         📄 Post Detail Page
│   │   └── Uses similar components as Explorer
│   │
│   ├── profile/[id]/page.tsx      👤 User Profile
│   │   └── Shows user's posts in feed format
│   │
│   ├── search/page.tsx            🔍 Advanced Search
│   │   └── <AdvancedSearch />
│   │
│   ├── lists/page.tsx             📋 Lists Management
│   │   └── List grid
│   │
│   ├── lists/[id]/page.tsx        📋 Individual List Feed
│   │   └── Posts from list members
│   │
│   ├── people/page.tsx            🤝 Network/Connections
│   │
│   ├── hub/page.tsx               💼 Projects Hub
│   │
│   └── messages/page.tsx          💬 Messages
│
├── embed/post/[id]/page.tsx       🔗 Public Embed
│
└── api/
    ├── unfurl/route.ts            🔗 Link preview fetcher
    ├── translate/route.ts         🌐 Translation service
    └── video-thumbnail/route.ts   🎬 Video thumbnail gen
```

---

## 🎨 Component Relationships

### Post Composer Ecosystem

```
┌────────────────────────────────────────────────────────────┐
│                      Post Composer                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Text Input   │  │ Media Tools  │  │ Advanced     │    │
│  │              │  │              │  │ Options      │    │
│  │ - Textarea   │  │ - EmojiPicker│  │ - ContentWarn│    │
│  │ - @mentions  │  │ - GifPicker  │  │ - Poll       │    │
│  │ - #hashtags  │  │ - VideoUpload│  │ - Schedule   │    │
│  │ - Char count │  │ - Images     │  │ - CTA        │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                Action Buttons                         │ │
│  │  [📷] [🎬] [😀] [📊] [⚠️] [📅]         [Post]       │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### Post Card Ecosystem

```
┌────────────────────────────────────────────────────────────┐
│                         Post Card                           │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Header: Avatar | Name | Username | Time | [⋮]      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Content:                                            │  │
│  │   - Text with @mentions and #hashtags               │  │
│  │   - Media (images/video/gif)                        │  │
│  │   - Link Preview Card                               │  │
│  │   - Quoted Post                                     │  │
│  │   - Poll (if applicable)                            │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ Engagement: [❤️ Like] [💬 Reply] [🔁 Repost] [🔖]  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### Post Menu (Three-Dot Menu)

```
┌─────────────────────────────┐
│        Post Menu            │
├─────────────────────────────┤
│                             │
│  Own Post:                  │
│  ✏️  Edit                   │
│  📌 Pin to profile          │
│  📊 View analytics          │
│  🕒 View edit history       │
│  🔗 Copy link              │
│  📋 Embed post             │
│  ────────────────          │
│  🗑️  Delete                 │
│                             │
│  Others' Posts:             │
│  👁️  Not interested         │
│  🔇 Mute user              │
│  🚫 Block user             │
│  🚩 Report post            │
│  🔗 Copy link              │
│  📋 Embed post             │
│                             │
└─────────────────────────────┘
```

---

## 🔄 Data Flow

### Creating a Post

```
User Input
    ↓
┌────────────────┐
│ Post Composer  │
└────────────────┘
    ↓
    ├─→ Text content
    ├─→ Media upload (if any)
    ├─→ GIF selection (if any)
    ├─→ URL detection → /api/unfurl
    ├─→ Content warning (if any)
    └─→ @mentions extraction
    ↓
┌────────────────┐
│ handlePost()   │
└────────────────┘
    ↓
    ├─→ Upload media to Supabase Storage
    ├─→ Fetch link preview
    ├─→ Parse hashtags
    ├─→ Extract @mentions
    └─→ Insert to posts table
    ↓
┌────────────────┐
│ Database       │
│ Triggers       │
└────────────────┘
    ↓
    ├─→ Update search_vector
    ├─→ Create notifications for @mentions
    └─→ Update user stats
    ↓
┌────────────────┐
│ Realtime       │
│ Updates        │
└────────────────┘
    ↓
Feed refreshes for all viewers
```

### Viewing a Post

```
User clicks post
    ↓
Navigate to /post/[id]
    ↓
┌────────────────┐
│ Load Post Data │
└────────────────┘
    ↓
    ├─→ Post content
    ├─→ Author profile
    ├─→ Media URLs
    ├─→ Link preview
    ├─→ Quoted post (if any)
    ├─→ Parent post (if reply)
    └─→ User interactions (liked, reposted, bookmarked)
    ↓
┌────────────────┐
│ Load Comments  │
└────────────────┘
    ↓
    └─→ Threaded comments with replies
    ↓
┌────────────────┐
│ Track View     │
└────────────────┘
    ↓
    └─→ Insert to post_impressions
```

### Advanced Search Flow

```
User enters query
    ↓
┌────────────────┐
│ Debounce 500ms │
└────────────────┘
    ↓
┌────────────────┐
│ Apply Filters  │
└────────────────┘
    ↓
    ├─→ Full-text search (search_vector)
    ├─→ User filter (@username)
    ├─→ Date range
    ├─→ Post type
    └─→ Min engagement
    ↓
┌────────────────┐
│ Query Database │
└────────────────┘
    ↓
Display results with highlighting
```

---

## 🗂️ State Management

### Explorer Page State

```tsx
// User & Auth
currentUser: User | null
userInteractions: {
  likedPostIds: Set<string>
  repostedPostIds: Set<string>
  bookmarkedPostIds: Set<string>
}

// Feed
posts: Post[]
loading: boolean
hasMore: boolean
cursor: string | null

// Composer
composerExpanded: boolean
content: string
mediaUrls: string[]
gifUrl: string | null
contentWarning: string
postType: string

// UI State
showGifPicker: boolean
showVideoUploader: boolean
showThreadComposer: boolean
editHistoryPostId: string | null
analyticsPostId: string | null
engagementModal: { type, postId } | null

// Feed Controls
sortBy: 'latest' | 'top' | 'trending'
selectedTag: string | null
newPostsCount: number
scrollingUp: boolean

// Draft Management
hasDraft: boolean
showSaveDraftModal: boolean

// Keyboard
showKeyboardHelp: boolean
```

---

## 📦 Component Props Interface

### Core Component Interfaces

```tsx
// Post Card
interface PostCardProps {
  post: Post;
  currentUser: User | null;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  onRepost: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onEdit?: (post: Post) => void;
  onDelete?: (postId: string) => void;
}

// Post Menu
interface PostMenuProps {
  postId: string;
  userId: string;
  currentUserId?: string;
  isOwnPost: boolean;
  isPinned?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onViewAnalytics?: () => void;
  onViewEditHistory?: () => void;
}

// Modals
interface ModalProps {
  postId?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

// Media Components
interface MediaUploadProps {
  onUpload: (url: string, metadata?: any) => void;
  onRemove?: () => void;
  maxSize?: number;
}
```

---

## 🔌 Integration Points

### Database → Frontend

```
Supabase Tables
    ↓
RLS Policies (security)
    ↓
Supabase Client (queries)
    ↓
React Components (state)
    ↓
UI Rendering
```

### Frontend → Database

```
User Action
    ↓
Event Handler
    ↓
Optimistic Update (UI)
    ↓
Supabase Mutation
    ↓
Server Response
    ↓
Confirm/Rollback Update
```

### Realtime Updates

```
Database Change
    ↓
Supabase Realtime
    ↓
WebSocket Event
    ↓
Frontend Listener
    ↓
State Update
    ↓
UI Re-render
```

---

## 🎯 Component Responsibilities

### Presentational Components
- `LinkPreview` - Display link preview card
- `ContentWarning` - Show/hide warned content
- `EmojiPicker` - Display emoji grid
- `KeyboardShortcutsHelp` - Show shortcuts modal

### Container Components
- `AdvancedSearch` - Search logic + UI
- `PostAnalyticsModal` - Fetch + display analytics
- `EditHistoryModal` - Fetch + display history
- `ThreadComposer` - Multi-post creation logic

### Utility Components
- `PostMenu` - Actions menu with side effects
- `VideoUploader` - File handling + upload
- `GifPicker` - API integration + selection

### Layout Components
- `ExplorerLeftRail` - Sidebar navigation
- `TrendingSidebar` - Right sidebar content

---

## 🧪 Testing Strategy

### Unit Tests
```
Component Tests
├── Rendering
├── User interactions
├── State updates
└── Edge cases
```

### Integration Tests
```
Feature Tests
├── Post creation flow
├── Editing flow
├── Search flow
└── Analytics flow
```

### E2E Tests
```
User Flows
├── Sign up → Create post → Interact
├── Search → View results → Filter
├── Create list → Add members → View feed
└── Thread creation → Publish → View
```

---

## 📊 Performance Considerations

### Code Splitting
```tsx
// Lazy load heavy components
const EditHistoryModal = lazy(() => import('@/components/EditHistoryModal'));
const PostAnalyticsModal = lazy(() => import('@/components/PostAnalyticsModal'));
const ThreadComposer = lazy(() => import('@/components/ThreadComposer'));
```

### Memoization
```tsx
// Expensive calculations
const sortedPosts = useMemo(() => 
  posts.sort((a, b) => ...), 
  [posts, sortBy]
);

// Prevent re-renders
const PostCard = memo(PostCardComponent);
```

### Debouncing
```tsx
// Search input
const debouncedSearch = debounce(searchUsers, 500);

// Scroll events
const debouncedScroll = debounce(handleScroll, 100);
```

---

## 🎉 Summary

This architecture provides:
- ✅ **Modularity** - Components are reusable and composable
- ✅ **Scalability** - Easy to add new features
- ✅ **Maintainability** - Clear separation of concerns
- ✅ **Performance** - Optimized rendering and data fetching
- ✅ **Type Safety** - TypeScript throughout
- ✅ **Accessibility** - ARIA labels and keyboard navigation
- ✅ **Testability** - Clear component boundaries

**Your component architecture is production-ready! 🚀**


