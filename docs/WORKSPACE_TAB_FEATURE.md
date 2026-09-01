# Workspace Tab Feature

## Overview

The Workspace Tab is a unified workspace that combines **Tasks** and **Files** into a single, powerful collaboration hub. This redesign improves the user experience by reducing tab clutter and providing a more integrated workflow.

---

## What Changed?

### Before (Separate Tabs)
- ❌ **Tasks Tab** - Separate tab for task management
- ❌ **Files Tab** - Separate tab for file management  
- ❌ **8 Total Tabs** - Information overload

### After (Unified Workspace)
- ✅ **Workspace Tab** - Combined tasks and files in one place
- ✅ **Split View** - Work on tasks while accessing files
- ✅ **Fewer Tabs** - Reduced from 8 to 5-6 tabs (cleaner UI)

---

## Features

### 🎯 Two View Modes

#### 1. **Tasks View** (Default)
- Full-screen task management
- Kanban board with drag-and-drop
- Keyboard shortcuts: `Ctrl+N`, `Ctrl+K`, `Ctrl+R`
- Ideal for focused task work

#### 2. **Files View**
- Full-screen file management
- Grid/list view toggle
- Preview, bulk actions, filtering
- Organized file management

### 📱 Responsive Design

**Desktop & Mobile:**
- Simple toggle between Tasks and Files views
- Two-button interface for easy switching
- Full-screen content for better focus

### 🎨 Visual Elements

#### Info Banner
- Context-aware tips based on current view mode
- Quick maximize button in split view
- Blue accent design for visibility

#### Quick Stats Bar
- **Active Tasks** - Count of todo and in-progress tasks
- **Completed** - Finished tasks counter
- **Total Files** - File count across categories
- **Hours Logged** - Time tracking summary

#### Keyboard Shortcuts
- Collapsible section showing all available shortcuts
- Desktop only (hidden on mobile)
- Includes: Ctrl+N (new task), Ctrl+K (search), Ctrl+R (refresh)

---

## Component Structure

### File Location
```
/nb/components/projects/WorkspaceTab.tsx
```

### Props Interface
```typescript
interface WorkspaceTabProps {
  projectId: string;
  isOwnerOrMember: boolean;
  projectCreatorId?: string;
  currentUserId: string | null;
}
```

### Dependencies
- **TasksTab** - Kanban board with task management
- **FilesTab** - File grid/list with preview and bulk actions
- **lucide-react** - Icons (Layout, ClipboardList, FileArchive, Maximize2)
- Dynamic imports for performance optimization

---

## Usage

### Integration in Project Detail Page

The Workspace tab is automatically available in the project detail page:

```tsx
{activeTab === "workspace" && (
  <WorkspaceTab
    projectId={id as string}
    projectCreatorId={project.creator_id}
    isOwnerOrMember={isCreator || isCollaborator}
    currentUserId={currentUserId}
  />
)}
```

### Tab Navigation

```tsx
const tabs = [
  { id: "overview", label: "Overview", icon: Info },
  { id: "workspace", label: "Workspace", icon: Briefcase }, // ← NEW!
  { id: "discussion", label: "Discussion", icon: MessageCircle },
  { id: "insights", label: "Insights", icon: BarChart3 },
  // ... other tabs
];
```

---

## User Experience Benefits

### For Project Owners
- ✅ Manage tasks and review file submissions side-by-side
- ✅ Quick access to both areas without switching tabs
- ✅ Better overview of project workspace

### For Collaborators
- ✅ Upload files while viewing task requirements
- ✅ Attach files to tasks without leaving the workspace
- ✅ More efficient workflow

### For All Users
- ✅ Reduced cognitive load (fewer tabs)
- ✅ Contextual workspace based on role
- ✅ Flexible view modes for different work styles

---

## Access Control

### Locked for Non-Members
- Displays a lock icon with "Access Restricted" message
- Clear explanation that membership is required
- Prevents unauthorized access

### Full Access for Members
- Project owner and collaborators get full access
- All features unlocked (create, edit, delete tasks/files)
- Real-time updates via Supabase subscriptions

---

## Technical Details

### Performance Optimizations
- **Dynamic Imports:** TasksTab and FilesTab load on demand
- **Lazy Loading:** Components only render when workspace tab is active
- **Memoization:** View state preserved during tab switching

### State Management
```typescript
const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("tasks");
const [activePanel, setActivePanel] = useState<"tasks" | "files">("tasks");
```

### View Toggle
- **Unified Controls:** Same two-button interface on all devices
- **Simple Toggle:** Click Tasks or Files to switch views
- **State Persistence:** Current view maintained during navigation

---

## Future Enhancements

### Phase 2 (Planned)
- [ ] Drag-and-drop files onto tasks to link them
- [ ] Quick file upload from task cards
- [ ] Inline file preview within task details
- [ ] Workspace search across tasks and files

### Phase 3 (Proposed)
- [ ] Workspace templates (preset layouts)
- [ ] Customizable panel sizes
- [ ] Workspace activity timeline
- [ ] Collaborative cursors (see who's viewing what)

---

## Migration Notes

### From Old Structure
If you're migrating from the old separate tabs:

**Old imports:**
```typescript
const TasksTab = dynamic(() => import("@/components/projects/TasksTab"));
const FilesTab = dynamic(() => import("@/components/projects/FilesTab"));
```

**New import:**
```typescript
import WorkspaceTab from "@/components/projects/WorkspaceTab";
```

**Old tabs array:**
```typescript
{ id: "tasks", label: "Tasks", icon: ClipboardList },
{ id: "files", label: "Files", icon: FileArchive },
```

**New tabs array:**
```typescript
{ id: "workspace", label: "Workspace", icon: Briefcase },
```

### Data Requirements
No database changes required! The Workspace tab uses the same:
- `project_tasks` table (existing)
- `project_files` table (existing)
- `project_collaborators` table (existing)

---

## Support & Troubleshooting

### Common Issues

**Issue:** Workspace tab doesn't load
- **Solution:** Check that user is a project member (owner or collaborator)
- **Check:** Verify `isOwnerOrMember` prop is correctly set

**Issue:** Split view not showing on desktop
- **Solution:** Ensure screen width is above medium breakpoint (768px)
- **Check:** Browser zoom level and responsive view settings

**Issue:** Files or tasks not loading
- **Solution:** Verify Supabase subscriptions are active
- **Check:** Console for real-time connection errors

### Debug Mode
Enable verbose logging by adding to console:
```javascript
localStorage.setItem('debug-workspace', 'true');
```

---

## Credits

**Design Inspired By:**
- Notion's database views
- Linear's project workspace
- GitHub's repository tabs

**Built With:**
- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Supabase Realtime
- Lucide React Icons

---

## Changelog

### Version 1.1.0 (Current)
- 🔄 Simplified to two-button toggle (Tasks / Files)
- ❌ Removed split view for cleaner interface
- ✨ Unified controls across all devices
- ✨ Improved focus with full-screen views

### Version 1.0.0
- ✨ Initial release of Workspace tab
- ✨ Split view with Tasks and Files
- ✨ Three view modes (split, tasks-only, files-only)
- ✨ Responsive mobile/desktop layouts
- ✨ Quick stats bar
- ✨ Keyboard shortcuts section
- ✨ Access control for non-members

---

## Screenshots

### Tasks View
```
┌─────────────────────────────────────────────────────────┐
│  Workspace              [Tasks] [Files]                 │
├─────────────────────────────────────────────────────────┤
│                    Workspace Tips                       │
│  💡 Use keyboard shortcuts: Ctrl+N, Ctrl+K, Ctrl+R     │
├─────────────────────────────────────────────────────────┤
│   📋 Task Board                                         │
│   ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│   │   Todo       │  │ In Progress  │  │    Done     │ │
│   │   • Task 1   │  │   • Task 3   │  │  ✓ Task 5  │ │
│   │   • Task 2   │  │   • Task 4   │  │  ✓ Task 6  │ │
│   └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                         │
│ [Stats: Active Tasks | Completed | Files | Hours]      │
└─────────────────────────────────────────────────────────┘
```

### Files View
```
┌─────────────────────────────────────────────────────────┐
│  Workspace              [Tasks] [Files]                 │
├─────────────────────────────────────────────────────────┤
│                    Workspace Tips                       │
│  💡 Filter, preview files, and use bulk actions        │
├─────────────────────────────────────────────────────────┤
│   📁 Files                        [Grid] [List]         │
│   ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐      │
│   │  📄    │  │  📄    │  │  📄    │  │  📄    │      │
│   │ File 1 │  │ File 2 │  │ File 3 │  │ File 4 │      │
│   └────────┘  └────────┘  └────────┘  └────────┘      │
│   ┌────────┐  ┌────────┐                               │
│   │  📄    │  │  📄    │                               │
│   │ File 5 │  │ File 6 │                               │
│   └────────┘  └────────┘                               │
│                                                         │
│ [Stats: Active Tasks | Completed | Files | Hours]      │
└─────────────────────────────────────────────────────────┘
```

---

**Last Updated:** November 23, 2025  
**Status:** ✅ Production Ready  
**Version:** 1.0.0

