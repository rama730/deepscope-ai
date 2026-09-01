# 💾 Save Draft Feature

## ✅ Feature Implemented

The post composer now **automatically prompts users to save drafts** when clicking outside with unsaved content, preventing accidental data loss.

## 🎯 How It Works

### **User Flow:**

1. **User starts typing** in the composer
2. **User clicks outside** the composer
3. **Modal appears** with 3 options:
   - **Save Draft** → Saves to localStorage, collapses composer
   - **Discard** → Clears all content, collapses composer
   - **Keep Editing** → Returns to composer

4. **Draft persists** across page refreshes
5. **Auto-loads** when user returns to Explorer
6. **Auto-clears** after successful post

### **Smart Detection:**

The modal **only appears** if:
- ✅ Composer is expanded
- ✅ User has typed content OR uploaded images
- ✅ User clicks outside the composer

The modal **won't appear** if:
- ❌ Composer is empty
- ❌ User is still interacting with the form
- ❌ User clicks Post button (draft auto-clears)

## 💻 Technical Implementation

### **State Management:**
```typescript
const [showSaveDraftModal, setShowSaveDraftModal] = useState(false);
const [hasDraft, setHasDraft] = useState(false);
```

### **LocalStorage Structure:**
```typescript
{
  content: string;
  postType: 'standard' | 'project_update' | 'achievement' | 'collaboration' | 'media' | 'poll';
  tags: string;
  collabRoles: string;
  collabSkills: string;
  pollQuestion: string;
  pollOptions: string[];
  ctaLabel: string;
  ctaUrl: string;
  savedAt: string; // ISO timestamp
}
```

### **Core Functions:**

#### **1. Load Draft (on mount)**
```typescript
function loadDraft() {
  const draft = localStorage.getItem('post_draft');
  if (draft) {
    const parsed = JSON.parse(draft);
    setContent(parsed.content || '');
    setPostType(parsed.postType || 'standard');
    // ... restore all fields
    setHasDraft(true);
  }
}
```

#### **2. Save Draft**
```typescript
function saveDraft() {
  const draft = {
    content,
    postType,
    tags: tagsInput,
    // ... all form fields
    savedAt: new Date().toISOString()
  };
  localStorage.setItem('post_draft', JSON.stringify(draft));
}
```

#### **3. Clear Draft**
```typescript
function clearDraft() {
  localStorage.removeItem('post_draft');
  setHasDraft(false);
}
```

### **Click Outside Detection:**
```typescript
useOnClickOutside(composerRef, () => {
  if (composerExpanded) {
    if (content.trim() || images.length > 0) {
      setShowSaveDraftModal(true); // ← Show modal
    } else {
      setComposerExpanded(false); // ← Just collapse
    }
  }
});
```

## 🎨 UI Components

### **Save Draft Modal:**
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
  <div className="w-full max-w-md rounded-2xl bg-white p-6">
    <h3>Save draft?</h3>
    <p>You have unsaved changes. Would you like to save this as a draft?</p>
    
    <button onClick={handleSaveDraft}>Save Draft</button>
    <button onClick={handleDiscardDraft}>Discard</button>
    <button onClick={handleCancelDraft}>Keep Editing</button>
  </div>
</div>
```

### **Visual Indicator:**
- **Default placeholder**: "What's happening?!"
- **With draft**: "Continue your draft..."

## 📊 User Experience Flow

```
┌─────────────────────────────────────┐
│ User types in composer              │
│ "Building a new feature for..."     │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ User clicks outside                 │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│ Modal: "Save draft?"                │
│                                     │
│ [Save Draft] [Discard] [Keep Edit] │
└─────────────────┬───────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
        ▼         ▼         ▼
    ┌─────┐   ┌────┐   ┌────────┐
    │Save │   │Disc│   │Cancel  │
    │Draft│   │card│   │        │
    └──┬──┘   └──┬─┘   └───┬────┘
       │         │         │
       ▼         ▼         ▼
   Saved to  Cleared   Back to
   localStorage  all    composer
```

## 🧪 Test Scenarios

### ✅ Test 1: Save Draft with Text
1. Type "Hello world"
2. Click outside
3. Click "Save Draft"
4. **Expected**: Draft saved, composer collapses
5. Refresh page
6. **Expected**: "Continue your draft..." appears, content restored

### ✅ Test 2: Discard Draft
1. Type "Hello world"
2. Click outside
3. Click "Discard"
4. **Expected**: All content cleared, composer collapses
5. Refresh page
6. **Expected**: No draft loaded, normal placeholder

### ✅ Test 3: Keep Editing
1. Type "Hello world"
2. Click outside
3. Click "Keep Editing"
4. **Expected**: Modal closes, stays in composer, content preserved

### ✅ Test 4: Draft with Images
1. Upload 2 images
2. Type "Check out these photos"
3. Click outside
4. Click "Save Draft"
5. **Expected**: Text saved, images cleared (can't save File objects)
6. Refresh
7. **Expected**: Text restored, images gone

### ✅ Test 5: Auto-clear After Post
1. Type "My first post"
2. Click "Post" button
3. **Expected**: Post submitted, draft auto-cleared
4. Refresh page
5. **Expected**: No draft, normal placeholder

### ✅ Test 6: Empty Composer
1. Click in composer (expands)
2. Don't type anything
3. Click outside
4. **Expected**: No modal, composer just collapses

## 🚀 Benefits

1. **Prevents Data Loss**: Never lose your work accidentally
2. **Auto-Save**: No manual "Save Draft" button needed
3. **Persistent**: Survives page refreshes
4. **Smart**: Only prompts when necessary
5. **Clear Actions**: 3 clear options (Save/Discard/Cancel)
6. **Visual Feedback**: Placeholder changes when draft exists
7. **Auto-Cleanup**: Draft clears after successful post

## 🔒 Storage

- **Method**: `localStorage`
- **Key**: `post_draft`
- **Size**: ~1-2KB (text only, no images)
- **Persistence**: Until manually cleared or post submitted
- **Privacy**: Local only, not synced to server

## ⚠️ Limitations

1. **Images Not Saved**: File objects can't be stored in localStorage
   - Solution: Text content is saved, user needs to re-upload images

2. **Single Draft**: Only one draft at a time
   - Future: Could implement multiple drafts with timestamps

3. **Browser-Specific**: Draft won't sync across devices
   - Future: Could add server-side draft storage

4. **Storage Limit**: localStorage has 5-10MB limit
   - Current usage: Minimal (text only)

## 📈 Future Enhancements

### Phase 2:
- [ ] Multiple drafts with list UI
- [ ] Server-side draft storage (sync across devices)
- [ ] Draft auto-save every 30 seconds
- [ ] Draft timestamps ("Last saved 2 minutes ago")
- [ ] Draft search/filter

### Phase 3:
- [ ] Image preview restoration (via base64 or server upload)
- [ ] Draft version history
- [ ] Draft templates
- [ ] Schedule posts from drafts

## 📦 Files Modified

### Updated:
1. `/app/(main)/explorer/page.tsx`
   - Added draft state management
   - Added `loadDraft()`, `saveDraft()`, `clearDraft()` functions
   - Added `handleSaveDraft()`, `handleDiscardDraft()`, `handleCancelDraft()`
   - Added Save Draft Modal UI
   - Modified `useOnClickOutside` to trigger modal

## 🎉 Summary

The draft-saving feature provides a **professional, user-friendly experience**:
- ✅ Automatic prompt when clicking outside with content
- ✅ Saves all form fields to localStorage
- ✅ Auto-loads on page refresh
- ✅ Clear 3-option modal (Save/Discard/Cancel)
- ✅ Visual indicator for existing drafts
- ✅ Auto-clears after successful post
- ✅ Zero data loss for text content

**Total Implementation**: ~150 lines of code
**Storage Used**: ~1-2KB per draft
**User Friction**: Minimal (smart detection)

Ready to test! 🚀



