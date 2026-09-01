# 🔴 URGENT: Security Remediation Steps

## Critical Security Issue: Committed Database Connection String

A database connection string was found in `supabase/.temp/pooler-url` and has been removed from the repository. **IMMEDIATE ACTION REQUIRED:**

### Step 1: Rotate Database Credentials (URGENT - Do This First)

1. **Log into Supabase Dashboard**: https://app.supabase.com
2. **Go to Project Settings → Database**
3. **Reset Database Password**:
   - Generate a new database password
   - Update all connection strings in your deployment environments
4. **Rotate Pooler Connection String**:
   - The pooler URL contains database credentials
   - Generate a new pooler connection string
   - Update in Vercel/environment variables
5. **Rotate Service Role Key** (if you suspect it was exposed):
   - Go to Project Settings → API
   - Generate a new service role key
   - Update `SUPABASE_SERVICE_ROLE_KEY` in all environments

### Step 2: Remove from Git History (Required)

The file has been removed from the current commit, but it still exists in git history. You must purge it:

#### Option A: Using git-filter-repo (Recommended)

```bash
# Install git-filter-repo first
pip install git-filter-repo

# Clone a fresh copy (safety)
cd /tmp
git clone --mirror git@github.com:rama730/nb-s.git nb-s-clean.git
cd nb-s-clean.git

# Remove the file from all history
git filter-repo --invert-paths --paths supabase/.temp/pooler-url

# Force push (coordinate with team first!)
git push --force --all
git push --force --tags
```

#### Option B: Using BFG Repo-Cleaner

```bash
# Install BFG
brew install bfg  # or download from https://rtyley.github.io/bfg-repo-cleaner/

# Clone fresh
cd /tmp
git clone --mirror git@github.com:rama730/nb-s.git nb-s-clean.git
cd nb-s-clean.git

# Remove file
bfg --delete-files supabase/.temp/pooler-url

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (coordinate with team!)
git push --force --all
git push --force --tags
```

### Step 3: Verify Remediation

After rotating credentials and cleaning history:

1. **Verify credentials are rotated**:
   - Test new database connection
   - Test new service role key
   - Verify old credentials no longer work

2. **Verify git history is clean**:

   ```bash
   git log --all --full-history -- supabase/.temp/pooler-url
   # Should return nothing
   ```

3. **Scan for other secrets**:

   ```bash
   # Using truffleHog
   docker run -it -v "$PWD:/pwd" trufflesecurity/trufflehog:latest github --repo=rama730/nb-s

   # Or using detect-secrets
   detect-secrets scan --baseline .secrets.baseline
   ```

### Step 4: Prevent Future Incidents

1. **✅ Already Done**: Added `.temp/` directories to `.gitignore`
2. **✅ Already Done**: Added secret scanning workflow (`.github/workflows/secret-scanning.yml`)
3. **✅ Already Done**: Added pre-commit hooks configuration

**Next Steps**:

- Install pre-commit hooks: `pip install pre-commit && pre-commit install`
- Or use: `npx pre-commit install`
- Enable GitHub secret scanning in repository settings
- Review and restrict repository access if needed

### Step 5: Notify Team

After force-pushing cleaned history:

- Notify all collaborators that they need to re-clone the repository
- Old clones will have the secret in history
- Everyone should: `git fetch origin && git reset --hard origin/main`

## Files Changed in This Remediation

- ✅ Removed `supabase/.temp/pooler-url` and all temp files from git tracking
- ✅ Added `.temp/` patterns to `.gitignore` (root and `nb/`)
- ✅ Added secret scanning GitHub Action
- ✅ Added pre-commit hooks configuration
- ✅ Improved service role key usage comments

## Additional Security Recommendations

1. **Enable GitHub Secret Scanning**: Repository Settings → Security → Secret scanning
2. **Enable Branch Protection**: Require PR reviews before merging
3. **Use Environment Secrets**: Never commit secrets, use GitHub Secrets or Vercel env vars
4. **Regular Audits**: Run secret scans monthly
5. **Access Control**: Review who has access to the repository

---

**Status**: File removed from tracking, history cleanup required, credentials must be rotated immediately.
