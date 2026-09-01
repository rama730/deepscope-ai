# Quick Start Guide - Fixing Database Issues

## 🚨 **If You're Seeing Empty Error Objects `{}`**

This is almost always an **RLS (Row Level Security) policy issue** in your Supabase database.

---

## ⚡ **Quick Fix (Recommended)**

### **Run This One Script to Fix Everything**

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Open and run: **`COMPLETE_RLS_FIX.sql`**
3. Refresh your app
4. ✅ Done!

This will recreate all RLS policies correctly for:
- ✅ project_applications
- ✅ messages
- ✅ project_collaborators
- ✅ project_open_roles
- ✅ project_bookmarks

---

## 🔍 **Common Errors & Solutions**

### **Error: "Error checking existing application: {}"**

**What it means:** Can't check if you already applied to a project

**Quick fix:** 
- Run `COMPLETE_RLS_FIX.sql` OR
- Run `fix_rls_policies.sql` (just for applications)

**Status:** The app will still work - it just can't prevent duplicate applications

---

### **Error: "Error loading messages: {}"**

**What it means:** Can't load your conversations

**Quick fix:**
- Run `COMPLETE_RLS_FIX.sql` OR
- Run `fix_messages_rls.sql` (just for messages)

**After fix:** Messages page should load properly

---

### **Error: "Error loading members: {}"**

**What it means:** Wrong query syntax for project collaborators

**Status:** ✅ Already fixed in the code (no action needed)

---

## 📋 **Complete Setup Checklist**

### **1. Database Setup**
- [ ] Run `COMPLETE_RLS_FIX.sql` in Supabase SQL Editor
- [ ] Verify all migrations are applied (check Supabase Dashboard → Database → Migrations)

### **2. Environment Variables**
Check your `.env.local` file has:
```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### **3. Authentication**
- [ ] Users can sign up
- [ ] Users can log in
- [ ] User session persists on refresh

### **4. Test Features**
- [ ] Create a project
- [ ] Apply to a project
- [ ] View messages page
- [ ] Send a message
- [ ] Accept/reject application (as project creator)

---

## 🛠️ **Debugging Tips**

### **Check Browser Console**

All errors now include detailed logging. Open browser console (F12) and look for:

```
Error loading messages: {...}
Messages error message: [actual error]
Messages error code: [error code]
```

Share these details if you need help.

### **Common Error Codes**

| Code | Meaning | Fix |
|------|---------|-----|
| `42501` | Permission denied | Run `COMPLETE_RLS_FIX.sql` |
| `PGRST116` | RLS violation | Run `COMPLETE_RLS_FIX.sql` |
| Empty `{}` | RLS not configured | Run `COMPLETE_RLS_FIX.sql` |
| `23503` | Foreign key error | Check if related records exist |

### **Verify RLS Policies**

Run this in Supabase SQL Editor:

```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Expected policies:**
- `project_applications`: 3 policies (SELECT, INSERT, UPDATE)
- `messages`: 2 policies (SELECT, INSERT)
- `project_collaborators`: 2 policies (SELECT, ALL)
- `project_open_roles`: 2 policies (SELECT, ALL)
- `project_bookmarks`: 3 policies (SELECT, INSERT, DELETE)

---

## 📁 **Important Files**

| File | Purpose |
|------|---------|
| `COMPLETE_RLS_FIX.sql` | **Run this first** - Fixes all RLS policies |
| `fix_rls_policies.sql` | Fix just project_applications table |
| `fix_messages_rls.sql` | Fix just messages table |
| `FIXES_APPLIED.md` | Detailed changelog of all fixes |
| `TROUBLESHOOTING_RLS.md` | Deep dive troubleshooting guide |

---

## ✅ **What's Been Fixed in the Code**

1. ✅ **Application submission** - Now checks for duplicates and handles errors
2. ✅ **Message loading** - Optimized queries and error handling
3. ✅ **Project details** - Proper UI refresh after actions
4. ✅ **Error logging** - Detailed console logs for debugging
5. ✅ **Non-blocking checks** - App works even if some checks fail
6. ✅ **Query syntax** - Fixed Supabase join syntax issues

---

## 🆘 **Still Having Issues?**

1. **Check browser console** - Look for detailed error messages
2. **Run `COMPLETE_RLS_FIX.sql`** - This fixes 99% of issues
3. **Verify authentication** - Make sure you're logged in
4. **Clear cache** - Try hard refresh (Ctrl+Shift+R)
5. **Check Supabase status** - Visit status.supabase.com

---

## 🎯 **Expected Behavior**

### **Applying to Projects**
1. Click "Apply to join" on a project
2. Fill out form
3. Submit → "Request Pending" shows immediately
4. Creator receives message notification
5. Application appears in database

### **Messaging**
1. Go to Messages page
2. See list of conversations
3. Click a conversation
4. Messages load
5. Can send new messages
6. Real-time updates when new messages arrive

### **Application Management**
1. Creator sees applications in Messages
2. Can accept/reject
3. Accepted users added to project_collaborators
4. Applicant receives notification

---

## 📞 **Need More Help?**

- Check `TROUBLESHOOTING_RLS.md` for detailed troubleshooting
- Check `FIXES_APPLIED.md` for technical details of all fixes
- Share browser console errors for specific help
















