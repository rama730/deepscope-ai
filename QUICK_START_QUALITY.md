# Quick Start: Quality Improvements

## 🚀 Immediate Actions (Do These First)

### 1. Rotate Exposed Credentials (5-60 minutes)
**URGENT**: The database connection string was exposed. Rotate immediately:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Project Settings → Database → Reset Password
3. Generate new pooler connection string
4. Update `SUPABASE_SERVICE_ROLE_KEY` in Supabase Dashboard → API
5. Update all environment variables in Vercel/deployment

**See**: `SECURITY_REMEDIATION.md` for detailed steps

### 2. Install Pre-commit Hooks (5 minutes)
```bash
cd nb
pip install pre-commit
pre-commit install
pre-commit run --all-files  # Test it
```

### 3. Clean Git History (30-120 minutes)
**After rotating credentials**, run:
```bash
./scripts/cleanup-git-history.sh
```

**WARNING**: This rewrites history. Coordinate with team first!

## ✅ What's Already Fixed

- ✅ Removed committed database connection string
- ✅ Fixed service role key exposure
- ✅ Added LICENSE, SECURITY.md, CODEOWNERS
- ✅ Fixed CI/package manager mismatch (now uses pnpm)
- ✅ Added secret scanning workflow
- ✅ Added issue templates and PR template
- ✅ Added CodeQL analysis workflow
- ✅ Configured lint-staged for pre-commit

## 📊 Current Status

**Quality Score**: 58/100  
**Target Score**: 85+/100

### Completed ✅
- Critical security fixes
- Repository governance files
- CI/CD improvements
- Secret scanning setup

### Remaining 🔴
- Credential rotation (manual)
- Git history cleanup (manual)
- Test coverage (30% → 70%+)
- TypeScript strictness improvements

## 🎯 Next Steps

1. **Today**: Rotate credentials, install pre-commit hooks
2. **This Week**: Clean git history, run secret scans, improve test coverage
3. **This Month**: TypeScript improvements, more tests, static analysis

**Full Roadmap**: See `QUALITY_ROADMAP.md`

## 📝 Quick Reference

### Run Quality Checks
```bash
cd nb
pnpm lint              # Lint code
pnpm type-check        # Type check
pnpm test:coverage      # Run tests with coverage
pnpm test:e2e          # E2E tests
```

### Before Committing
```bash
# Pre-commit hooks will auto-run, or manually:
pnpm lint:fix
pnpm format
pnpm type-check
```

### Secret Scanning
```bash
# Using truffleHog
docker run -it -v "$PWD:/pwd" trufflesecurity/trufflehog:latest github --repo=rama730/nb-s

# Using detect-secrets
pip install detect-secrets
detect-secrets scan --baseline .secrets.baseline
```

## 🔗 Important Files

- `QUALITY_ROADMAP.md` - Full improvement plan
- `SECURITY_REMEDIATION.md` - Security fix instructions
- `.github/workflows/` - CI/CD workflows
- `.pre-commit-config.yaml` - Pre-commit hooks
- `nb/.lintstagedrc.json` - Lint-staged config

---

**Last Updated**: 2024

