# 🚀 Implementation Guide - Priority 3 Features

This guide shows you exactly how to integrate the new features into your existing project structure.

---

## 📋 Prerequisites

1. **Run the database migration:**
```bash
# Navigate to your Supabase project
cd nb

# Run the migration
supabase db push

# Or manually run the SQL in Supabase Dashboard
# File: nb/supabase/migrations/0024_task_comments.sql
```

2. **Verify all components are in place:**
```bash
nb/components/projects/
├── TaskComments.tsx           ✅
├── BulkTaskActions.tsx        ✅
├── QuickStatsWidget.tsx       ✅
├── ProjectExport.tsx          ✅
└── TaskTemplates.tsx          ✅

nb/components/ui/
├── LoadingSkeleton.tsx        ✅
├── Toast.tsx                  ✅
└── ConfirmDialog.tsx          ✅

nb/hooks/
└── useKeyboardShortcuts.ts    ✅
```

---

## 🎯 Integration Steps

### 1. Add Quick Stats to Overview Tab

**File:** `nb/components/projects/OverviewTab.tsx` (create if doesn't exist)

```tsx
"use client";

import QuickStatsWidget from "@/components/projects/QuickStatsWidget";
import ProjectExport from "@/components/projects/ProjectExport";

interface OverviewTabProps {
  project: any;
  projectId: string;
}

export default function OverviewTab({ project, projectId }: OverviewTabProps) {
  return (
    <div className="space-y-6 p-6">
      {/* Quick Stats at the top */}
      <div>
        <h2 className="text-2xl font-extrabold mb-4 bg-gradient-to-r from-zinc-900 to-zinc-700 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
          Project Dashboard
        </h2>
        <QuickStatsWidget projectId={projectId} />
      </div>

      {/* Project Details */}
      <div className="rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm">
        <h3 className="font-bold text-lg mb-3">About This Project</h3>
        <p className="text-zinc-700 dark:text-zinc-300">
          {project.description || "No description provided."}
        </p>
        
        {/* Tags */}
        {Array.isArray(project.tags) && project.tags.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold mb-2">Tags</p>
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-sm font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export Section */}
      <ProjectExport projectId={projectId} projectTitle={project.title} />
    </div>
  );
}
```

**Then in `page.tsx`:**
```tsx
import dynamic from "next/dynamic";

const OverviewTab = dynamic(() => import("@/components/projects/OverviewTab"), { ssr: false });

// In the tabs section:
{activeTab === "overview" && (
  <OverviewTab project={project} projectId={params.id} />
)}
```

---

### 2. Add Task Comments to Task Detail View

**Update:** `nb/components/projects/CreateTaskModal.tsx` or create `TaskDetailModal.tsx`

```tsx
"use client";

import { useState } from "react";
import TaskComments from "@/components/projects/TaskComments";

interface TaskDetailModalProps {
  task: any;
  onClose: () => void;
  currentUserId: string | null;
}

export default function TaskDetailModal({ task, onClose, currentUserId }: TaskDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-2 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-zinc-900 border-b-2 border-zinc-200 dark:border-zinc-800 p-6 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {task.title}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  task.status === "todo" ? "bg-zinc-100 dark:bg-zinc-800" :
                  task.status === "in_progress" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" :
                  "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                }`}>
                  {task.status.replace("_", " ")}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  task.priority === "high" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" :
                  task.priority === "medium" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" :
                  "bg-zinc-100 dark:bg-zinc-800"
                }`}>
                  {task.priority} priority
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Description */}
          {task.description && (
            <div>
              <h3 className="font-bold text-sm mb-2">Description</h3>
              <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Comments Section */}
          <div className="border-t-2 border-zinc-200 dark:border-zinc-800 pt-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Discussion
            </h3>
            <TaskComments taskId={task.id} currentUserId={currentUserId} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### 3. Add Bulk Operations to TasksTab

**Update:** `nb/components/projects/TasksTab.tsx`

```tsx
import { useState } from "react";
import BulkTaskActions from "@/components/projects/BulkTaskActions";

export default function TasksTab({ projectId, isOwnerOrMember }: TasksTabProps) {
  // ... existing state
  const [selectedTasks, setSelectedTasks] = useState<Task[]>([]);

  // ... existing functions

  // Add selection toggle function
  function toggleTaskSelection(task: Task) {
    if (selectedTasks.some(t => t.id === task.id)) {
      setSelectedTasks(selectedTasks.filter(t => t.id !== task.id));
    } else {
      setSelectedTasks([...selectedTasks, task]);
    }
  }

  // Add select all function
  function selectAllInColumn(tasks: Task[]) {
    const allSelected = tasks.every(t => selectedTasks.some(s => s.id === t.id));
    if (allSelected) {
      setSelectedTasks(selectedTasks.filter(t => !tasks.some(ct => ct.id === t.id)));
    } else {
      const newSelections = tasks.filter(t => !selectedTasks.some(s => s.id === t.id));
      setSelectedTasks([...selectedTasks, ...newSelections]);
    }
  }

  return (
    <div className="space-y-6">
      {/* ... existing header ... */}

      {/* Add bulk selection controls */}
      {tasks.length > 0 && (
        <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-900">
          <button
            onClick={() => {
              if (selectedTasks.length === tasks.length) {
                setSelectedTasks([]);
  } else {
                setSelectedTasks(tasks);
              }
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            {selectedTasks.length === tasks.length ? "Deselect All" : "Select All"}
            {selectedTasks.length > 0 && ` (${selectedTasks.length})`}
          </button>
          {selectedTasks.length > 0 && (
            <button
              onClick={() => setSelectedTasks([])}
              className="text-sm text-zinc-600 dark:text-zinc-400 hover:underline"
            >
              Clear Selection
            </button>
          )}
        </div>
      )}

      {/* Kanban Board */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Update TaskColumn to show checkboxes */}
        {(["todo", "in_progress", "done"] as const).map(status => (
          <TaskColumn
            key={status}
            status={status}
            tasks={tasksByStatus[status]}
            selectedTasks={selectedTasks}
            onTaskSelect={toggleTaskSelection}
            onSelectAll={() => selectAllInColumn(tasksByStatus[status])}
            // ... other props
          />
        ))}
      </div>

      {/* Bulk Actions Bar */}
      <BulkTaskActions
        selectedTasks={selectedTasks}
        onClearSelection={() => setSelectedTasks([])}
        onSuccess={() => {
          loadTasks();
          setSelectedTasks([]);
        }}
      />

      {/* ... existing modals ... */}
    </div>
  );
}

// Update TaskCard component to include checkbox
function TaskCard({ task, selected, onSelect, ...props }: TaskCardProps) {
  return (
    <div className="group relative">
      {/* Selection Checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => {
            e.stopPropagation();
            onSelect(task);
          }}
          className="w-4 h-4 rounded border-2 border-zinc-300 dark:border-zinc-600 checked:bg-blue-600 checked:border-blue-600 cursor-pointer"
        />
      </div>
      
      {/* Existing card content with pl-8 to make room for checkbox */}
      <div className="pl-8">
        {/* ... rest of card ... */}
      </div>
    </div>
  );
}
```

---

### 4. Add Task Templates to TasksTab

**Update:** `nb/components/projects/TasksTab.tsx`

```tsx
import { useState } from "react";
import TaskTemplates from "@/components/projects/TaskTemplates";

export default function TasksTab({ projectId, isOwnerOrMember }: TasksTabProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header with Template Button */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>{/* ... existing header content ... */}</div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-700 dark:text-purple-300 hover:shadow-lg transition-all font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Templates
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>
      </div>

      {/* Templates Section (collapsible) */}
      {showTemplates && (
        <div className="animate-in slide-in-from-top-5 duration-300">
          <TaskTemplates
            projectId={projectId}
            onTasksCreated={() => {
              loadTasks();
              setShowTemplates(false);
            }}
          />
        </div>
      )}

      {/* ... rest of TasksTab ... */}
    </div>
  );
}
```

---

### 5. Add Toast Provider to App Layout

**Update:** `nb/app/(main)/layout.tsx`

```tsx
import { ToastProvider } from "@/components/ui/Toast";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        {/* ... existing layout ... */}
        {children}
      </div>
    </ToastProvider>
  );
}
```

**Then use toasts anywhere:**
```tsx
import { useToast } from "@/components/ui/Toast";

function MyComponent() {
  const { showToast } = useToast();

  async function handleAction() {
    try {
      // ... your action
      showToast("Task created successfully!", "success");
    } catch (error) {
      showToast("Failed to create task", "error");
    }
  }
}
```

---

### 6. Replace Alert Dialogs with ConfirmDialog

**Before:**
```tsx
async function handleDelete() {
  if (confirm("Are you sure?")) {
    // delete logic
  }
}
```

**After:**
```tsx
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

function MyComponent() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      // delete logic
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button onClick={() => setShowDeleteConfirm(true)}>
        Delete
      </button>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        type="danger"
        confirmText="Delete"
        isLoading={deleting}
      />
    </>
  );
}
```

---

## 🎨 Example: Complete TaskColumn with Selection

```tsx
interface TaskColumnProps {
  status: "todo" | "in_progress" | "done";
  tasks: Task[];
  selectedTasks: Task[];
  onTaskSelect: (task: Task) => void;
  onSelectAll: () => void;
  onTaskClick: (task: Task) => void;
  onTaskTransition: (task: Task, type: "start" | "complete") => void;
}

function TaskColumn({ 
  status, 
  tasks, 
  selectedTasks, 
  onTaskSelect, 
  onSelectAll,
  onTaskClick,
  onTaskTransition 
}: TaskColumnProps) {
  const allSelected = tasks.length > 0 && tasks.every(t => 
    selectedTasks.some(s => s.id === t.id)
  );

  const statusConfig = {
    todo: { label: "To Do", icon: "📋", color: "zinc" },
    in_progress: { label: "In Progress", icon: "⚡", color: "yellow" },
    done: { label: "Done", icon: "✅", color: "emerald" },
  };

  const config = statusConfig[status];

  return (
    <div className="rounded-xl border-2 border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-4 shadow-sm">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <h3 className="font-bold text-sm">{config.label}</h3>
          <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-bold">
            {tasks.length}
          </span>
        </div>
        {tasks.length > 0 && (
          <button
            onClick={onSelectAll}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            title={allSelected ? "Deselect all" : "Select all"}
          >
            {allSelected ? "✓ All" : "Select"}
          </button>
        )}
      </div>

      {/* Tasks */}
      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-zinc-400 text-sm">
            <div className="text-3xl mb-2">{config.icon}</div>
            <p>No tasks</p>
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              selected={selectedTasks.some(t => t.id === task.id)}
              onSelect={() => onTaskSelect(task)}
              onClick={() => onTaskClick(task)}
              onTransition={onTaskTransition}
            />
          ))
        )}
      </div>
    </div>
  );
}
```

---

## 🧪 Testing Checklist

### Task Comments
- [ ] Can view comments on tasks in your projects
- [ ] Can add new comments
- [ ] Comments appear in real-time
- [ ] Can delete own comments
- [ ] Cannot delete others' comments
- [ ] Timestamps display correctly
- [ ] Empty state shows when no comments

### Bulk Operations
- [ ] Can select multiple tasks with checkboxes
- [ ] Select all/deselect all works
- [ ] Bulk status change works
- [ ] Bulk priority change works
- [ ] Bulk delete shows confirmation
- [ ] Action bar appears when tasks selected
- [ ] Can clear selection

### Quick Stats
- [ ] Shows correct task completion count
- [ ] Shows message count for last 7 days
- [ ] Shows file count for last 7 days
- [ ] Shows active member count
- [ ] Loads without errors
- [ ] Updates when data changes

### Project Export
- [ ] JSON export downloads correctly
- [ ] CSV export contains task data
- [ ] Markdown export is readable
- [ ] File naming is correct
- [ ] All data is included

### Task Templates
- [ ] Can select a template
- [ ] Preview shows all tasks
- [ ] Creates all tasks from template
- [ ] Tasks have correct priorities
- [ ] Can cancel template selection

---

## 🐛 Troubleshooting

### "Table task_comments does not exist"
```bash
# Run the migration
supabase db push

# Or manually in Supabase SQL Editor
```

### "Permission denied for table task_comments"
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename = 'task_comments';

-- Check policies exist
SELECT * FROM pg_policies 
WHERE tablename = 'task_comments';
```

### Bulk operations not working
```tsx
// Ensure project_tasks table has updated_at column
// If not, it should exist from migration 0023
```

### Toast notifications not showing
```tsx
// Ensure ToastProvider wraps your app
// Check browser console for errors
// Verify z-index isn't being overridden
```

---

## 📊 Performance Tips

1. **Debounce search inputs**
```tsx
import { useMemo } from "react";
import { debounce } from "lodash"; // or implement your own

const debouncedSearch = useMemo(
  () => debounce((query) => setSearchQuery(query), 300),
  []
);
```

2. **Virtualize long lists**
```tsx
// For 100+ tasks, consider react-window or react-virtual
import { FixedSizeList } from "react-window";
```

3. **Optimize real-time subscriptions**
```tsx
// Only subscribe when tab is visible
useEffect(() => {
  if (!isVisible) return;
  const channel = subscribeToComments();
  return () => channel.unsubscribe();
}, [isVisible]);
```

---

## 🎯 Next Steps

After implementation:

1. **Test thoroughly** with real users
2. **Gather feedback** on UX
3. **Monitor performance** (bundle size, load times)
4. **Iterate** based on usage patterns
5. **Document** team workflows

---

## 📞 Support

If you encounter issues:

1. Check the component files for JSDoc comments
2. Review `FEATURE_ADDITIONS.md` for detailed docs
3. Check console for error messages
4. Verify database migration ran successfully
5. Test RLS policies in Supabase SQL Editor

---

**Happy coding! 🚀**
