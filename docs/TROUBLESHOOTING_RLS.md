# Troubleshooting RLS Policy Issues

## Issue: "Error checking existing application: {}"

This error occurs when trying to check if a user already has an application for a project.

---

## Root Causes & Solutions

### 1. **RLS Policies Not Applied**

**Symptoms:** Empty error object `{}`

**Solution:** Run the RLS policy fix script
```bash
# In Supabase SQL Editor, run:
fix_rls_policies.sql
```

### 2. **User Not Authenticated**

**Symptoms:** Cannot read own applications

**Check:**
```javascript
// In browser console
const { data: { user } } = await supabase.auth.getUser();
console.log("Current user:", user);
```

**Solution:** Ensure user is logged in before applying to projects

### 3. **Database Connection Issues**

**Symptoms:** Intermittent errors

**Check:** Verify Supabase credentials in environment variables
```bash
# Check your .env.local file
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

---

## Enhanced Error Logging

The code now includes detailed error logging:

```typescript
if (checkError) {
  console.error("Error checking existing application:", checkError);
  console.error("Check error details:", JSON.stringify(checkError, null, 2));
  console.error("Check error message:", checkError?.message);
  console.error("Check error code:", checkError?.code);
  console.error("Check error hint:", checkError?.hint);
  console.error("Check error details object:", checkError?.details);
}
```

Check your browser console for these detailed logs to understand the exact error.

---

## Testing RLS Policies

### Test 1: Can you read your own applications?

```sql
-- In Supabase SQL Editor (logged in as a user)
SELECT * FROM project_applications WHERE applicant_id = auth.uid();
```

**Expected:** Should return your applications (or empty array if you haven't applied to anything)

**If fails:** RLS policy issue - run `fix_rls_policies.sql`

### Test 2: Can you insert an application?

```sql
-- In Supabase SQL Editor
INSERT INTO project_applications (
  project_id, 
  applicant_id, 
  role_applied_for, 
  message
) VALUES (
  'some-project-uuid',
  auth.uid(),
  'Test Role',
  'Test message'
);
```

**Expected:** Should insert successfully

**If fails:** Check insert policy or user authentication

### Test 3: JavaScript Query Test

```javascript
// In browser console
const { data, error } = await supabase
  .from("project_applications")
  .select("id, status")
  .eq("applicant_id", (await supabase.auth.getUser()).data.user.id);

console.log("Applications:", data);
console.log("Error:", error);
```

**Expected:** `data` should be an array, `error` should be null

---

## Common Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| `PGRST116` | RLS policy violation | Run fix_rls_policies.sql |
| `PGRST301` | JWT token invalid | Re-authenticate user |
| `42501` | Insufficient privilege | Check RLS policies |
| `23503` | Foreign key violation | Ensure project and user exist |

---

## Fallback Behavior

The code now includes a fallback - if checking for existing applications fails, it will:
1. Log detailed error information
2. Show a warning in console
3. **Proceed with the application anyway** (instead of blocking)

This ensures users can still apply even if the duplicate check fails.

---

## Manual RLS Policy Verification

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'project_applications';

-- Should return: rowsecurity = true

-- Check what policies exist
SELECT * FROM pg_policies 
WHERE tablename = 'project_applications';

-- Should show 3 policies:
-- 1. Applicants and creators read applications (SELECT)
-- 2. Users create own applications (INSERT)
-- 3. Creators update applications (UPDATE)
```

---

## Quick Fix Checklist

1. ✅ **Enhanced error logging** - Added detailed console logs
2. ✅ **Non-blocking check** - Application proceeds even if check fails
3. ✅ **Changed query syntax** - Removed `.maybeSingle()` which might cause issues
4. ✅ **SQL fix script** - Run `fix_rls_policies.sql` to reset policies
5. ✅ **Better error messages** - Shows all error properties for debugging

---

## If Issue Persists

1. **Check Browser Console** - Look for the detailed error logs
2. **Verify Authentication** - Ensure user is logged in
3. **Run SQL Fix** - Execute `fix_rls_policies.sql`
4. **Clear Browser Cache** - Sometimes stale data causes issues
5. **Check Supabase Dashboard** - Look at the Database → Policies section
6. **Contact Support** - Share the detailed error logs from console

---

## Expected Behavior After Fix

1. User fills out application form
2. System checks for existing applications (with enhanced error handling)
3. If duplicate found: Shows error message
4. If no duplicate: Submits application successfully
5. If check fails: Logs warning and proceeds with submission
6. Application appears in database
7. Project creator receives message notification
















