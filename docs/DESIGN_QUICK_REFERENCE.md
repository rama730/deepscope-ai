# 🎨 Design System - Quick Reference

## Professional Design Standards

### **Colors**

#### **Status Colors**
```css
/* Planning/Open */
bg-blue-50 dark:bg-blue-950/30
text-blue-700 dark:text-blue-300
border-blue-200 dark:border-blue-900

/* In Progress/Active */
bg-amber-50 dark:bg-amber-950/30
text-amber-700 dark:text-amber-300
border-amber-200 dark:border-amber-900

/* Completed/Done */
bg-emerald-50 dark:bg-emerald-950/30
text-emerald-700 dark:text-emerald-300
border-emerald-200 dark:border-emerald-900
```

#### **Base Colors**
```css
/* Primary Action */
bg-blue-600 hover:bg-blue-700

/* Text Hierarchy */
text-zinc-900  /* Main headings */
text-zinc-700  /* Body text */
text-zinc-600  /* Secondary text */
text-zinc-500  /* Metadata */
text-zinc-400  /* Disabled/Placeholder */
```

---

### **Typography**

```css
/* Page Titles */
text-2xl font-bold text-zinc-900

/* Section Headers */
text-xl font-bold text-zinc-900

/* Card Titles */
text-sm font-semibold text-zinc-900

/* Body Text */
text-sm text-zinc-700

/* Metadata/Labels */
text-xs text-zinc-500
```

---

### **Spacing**

```css
/* Container */
max-w-5xl mx-auto px-6 py-6

/* Section Gaps */
space-y-4

/* Card Padding */
p-6   /* Large cards */
p-4   /* Medium cards */
p-3   /* Small cards */
p-2   /* Compact areas */

/* Element Gaps */
gap-4  /* Between cards */
gap-3  /* Between groups */
gap-2  /* Between elements */
gap-1.5 /* Inline items */
```

---

### **Borders & Radius**

```css
/* Cards */
rounded-lg border border-zinc-200

/* Inputs/Buttons */
rounded-md border border-zinc-200

/* Badges */
rounded-md px-2 py-0.5

/* Progress Bars */
rounded-full
```

---

### **Buttons**

#### **Primary**
```css
px-4 py-2 bg-blue-600 text-white rounded-md 
hover:bg-blue-700 text-sm font-medium
```

#### **Secondary**
```css
px-3 py-2 rounded-md border border-zinc-200 
hover:bg-zinc-100 text-sm font-medium
```

#### **Icon Only**
```css
p-2 rounded-md border border-zinc-200 
hover:bg-zinc-100
```

---

### **Cards**

#### **Standard Card**
```css
rounded-lg border border-zinc-200 dark:border-zinc-800 
bg-white dark:bg-zinc-900 p-6
```

#### **Small Card**
```css
rounded-lg border border-zinc-200 dark:border-zinc-800 
bg-white dark:bg-zinc-900 p-4
```

---

### **Inputs**

```css
w-full px-4 py-2 rounded-md border border-zinc-200 
dark:border-zinc-700 bg-white dark:bg-zinc-800 
focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 
text-sm
```

---

### **Badges**

```css
/* Status Badge */
px-2.5 py-1 rounded-md text-xs font-medium
bg-{color}-50 text-{color}-700 border border-{color}-200

/* Count Badge */
px-2 py-0.5 rounded-md text-xs font-medium
bg-zinc-100 text-zinc-700
```

---

## File Structure

### **Main Dashboard**
`/nb/app/(main)/projects/[id]/page.tsx`
- Project header
- Lifecycle stages
- Tab navigation
- Tab content

### **Tasks Tab**
`/nb/components/projects/TasksTab.tsx`
- Task board header
- Search & filters
- Progress bar
- Kanban columns

---

## Dark Mode

All components support dark mode with consistent patterns:

```css
/* Background */
bg-white dark:bg-zinc-900

/* Text */
text-zinc-900 dark:text-zinc-100

/* Borders */
border-zinc-200 dark:border-zinc-800

/* Hover States */
hover:bg-zinc-100 dark:hover:bg-zinc-800
```

---

## Accessibility

- ✅ Minimum 1px borders for clarity
- ✅ Sufficient color contrast
- ✅ Clear text hierarchy
- ✅ Consistent interactive elements
- ✅ Keyboard navigation support

---

**Last Updated:** November 4, 2025
**Version:** 1.0


