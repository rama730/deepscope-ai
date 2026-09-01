# Quality Improvement Roadmap

**Current Score**: 58/100  
**Target Score**: 85+/100

## ✅ Already Completed (Recent Fixes)

- [x] **Critical**: Removed committed database connection string
- [x] **Critical**: Fixed service role key exposure (removed NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY)
- [x] **Critical**: Added LICENSE file (MIT)
- [x] **Critical**: Added SECURITY.md with disclosure process
- [x] **Critical**: Added CODEOWNERS file
- [x] **Critical**: Added issue templates (bug, feature, security)
- [x] **High**: Fixed CI/package manager mismatch (now uses pnpm)
- [x] **High**: Added secret scanning workflow
- [x] **High**: Added pre-commit hooks configuration
- [x] **High**: Added .gitignore for temp files
- [x] **High**: Verified service role keys are server-only

## 🔴 URGENT: Immediate Actions Required (Do Now)

### 1. Rotate Exposed Credentials (0-60 minutes)
**Status**: ⚠️ **NOT DONE** - Manual action required

- [ ] Rotate database password in Supabase Dashboard
- [ ] Generate new pooler connection string
- [ ] Rotate SUPABASE_SERVICE_ROLE_KEY (if exposed)
- [ ] Update all deployment environments (Vercel, etc.)
- [ ] Test new credentials in staging

**See**: `SECURITY_REMEDIATION.md` for detailed steps

### 2. Purge Secrets from Git History (30-120 minutes)
**Status**: ⚠️ **NOT DONE** - History cleanup required

The file is removed from tracking but still exists in git history. Use the script below:

```bash
# Run the cleanup script
./scripts/cleanup-git-history.sh
```

**See**: `SECURITY_REMEDIATION.md` for manual steps

### 3. Install Pre-commit Hooks (5 minutes)
**Status**: ⚠️ **NOT DONE** - Installation required

```bash
# Option 1: Using pip
pip install pre-commit
pre-commit install

# Option 2: Using npm
npm install -g @pre-commit/cli
pre-commit install

# Test it
pre-commit run --all-files
```

## 🟠 HIGH PRIORITY: Next 1-3 Days

### 4. Audit Service Role Key Usage (1-3 hours)
**Status**: ✅ Mostly done, needs final verification

- [x] Removed all NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY references
- [x] Verified env.ts marks service role as server-only
- [ ] **TODO**: Run full codebase scan to verify no client-side usage
- [ ] **TODO**: Add runtime check to prevent service role in client bundles

**Action**: Run `npm run audit:secrets` (once script is added)

### 5. Full Secret/History Scan (1-3 hours)
**Status**: ⚠️ **NOT DONE**

```bash
# Using truffleHog
docker run -it -v "$PWD:/pwd" trufflesecurity/trufflehog:latest github --repo=rama730/nb-s

# Using detect-secrets
pip install detect-secrets
detect-secrets scan --baseline .secrets.baseline
detect-secrets audit .secrets.baseline

# Using gitleaks
gitleaks detect --source . --verbose
```

### 6. Verify CI Coverage Artifacts (1-2 hours)
**Status**: ✅ Configured, needs validation

- [x] Jest configured to output lcov format
- [x] CI references correct path: `./nb/coverage/lcov.info`
- [ ] **TODO**: Run CI locally or on PR to verify artifact exists
- [ ] **TODO**: Ensure codecov upload succeeds

**Test**: Create a test PR and verify coverage uploads

### 7. Enforce CI Quality Gates (1-4 hours)
**Status**: ✅ Mostly configured

- [x] Lint job configured
- [x] Type-check job configured
- [x] Test job with coverage
- [x] E2E tests configured
- [ ] **TODO**: Remove `continue-on-error: true` from E2E once stable
- [ ] **TODO**: Add branch protection rules requiring all checks pass

## 🟡 MEDIUM PRIORITY: Next 1-2 Weeks

### 8. Pre-commit & Linting Enforcement (4-16 hours)
**Status**: ⚠️ Partially done

- [x] Pre-commit config created
- [ ] **TODO**: Install and test pre-commit hooks
- [ ] **TODO**: Add lint-staged for auto-fixing
- [ ] **TODO**: Ensure CI fails on lint/type errors (already configured)
- [ ] **TODO**: Add stricter ESLint rules

**Files to update**:
- `nb/eslint.config.mjs` - Add stricter rules
- `nb/package.json` - Add lint-staged script
- `.husky/pre-commit` - Add lint-staged hook

### 9. Improve TypeScript Strictness (2-7 days)
**Status**: ⚠️ Needs improvement

- [ ] **TODO**: Review and tighten `tsconfig.json` strict flags
- [ ] **TODO**: Add `noUncheckedIndexedAccess: true`
- [ ] **TODO**: Replace `any` types with explicit types or `unknown`
- [ ] **TODO**: Add type declarations for RPC results
- [ ] **TODO**: Add domain object types

**Target**: Zero `any` types in production code

### 10. Increase Test Coverage (1-3 weeks)
**Status**: ⚠️ Low coverage

**Current**: ~4 test files, coverage likely <30%  
**Target**: 70-85% coverage

- [ ] **TODO**: Add unit tests for business logic
- [ ] **TODO**: Add integration tests for API routes
- [ ] **TODO**: Add E2E tests for critical flows:
  - [ ] Signup/login
  - [ ] Project creation
  - [ ] File uploads
  - [ ] Messaging
- [ ] **TODO**: Mock Supabase client for unit tests
- [ ] **TODO**: Set up test database for integration tests

**Priority test files**:
- `nb/lib/api/rate-limit.ts` - Critical security logic
- `nb/lib/auth/*` - Authentication flows
- `nb/app/api/**` - API route handlers
- `nb/components/**` - UI components

### 11. Add Static Analysis & SAST (1-3 days)
**Status**: ⚠️ **NOT DONE**

- [ ] **TODO**: Add CodeQL workflow (GitHub Advanced Security)
- [ ] **TODO**: Add ESLint security plugins
- [ ] **TODO**: Set up SonarCloud or Snyk (optional)
- [ ] **TODO**: Add dependency vulnerability scanning

**Files to create**:
- `.github/workflows/codeql-analysis.yml`

### 12. Test SQL Migrations & RLS (3-7 days)
**Status**: ⚠️ **NOT DONE**

- [ ] **TODO**: Create test matrix for migrations
- [ ] **TODO**: Add integration tests for RLS policies
- [ ] **TODO**: Ensure migrations are idempotent
- [ ] **TODO**: Add CI job for migration validation

## 🟢 LOW PRIORITY: Ongoing Improvements

### 13. Process & Collaboration (Ongoing)
**Status**: ✅ Mostly done

- [x] CODEOWNERS added
- [x] Issue templates added
- [ ] **TODO**: Add PR template checklist
- [ ] **TODO**: Set up branch protection rules
- [ ] **TODO**: Configure automatic labels

### 14. Observability & Monitoring (1-2 weeks)
**Status**: ⚠️ Partially done

- [x] Sentry configured
- [ ] **TODO**: Verify source maps upload in CI
- [ ] **TODO**: Add structured logging
- [ ] **TODO**: Add metrics/dashboards
- [ ] **TODO**: Set up alerting

### 15. Dependency Hygiene (Ongoing)
**Status**: ✅ Dependabot configured

- [x] Dependabot configured
- [ ] **TODO**: Review and merge security updates promptly
- [ ] **TODO**: Set up auto-merge for patch updates
- [ ] **TODO**: Periodic manual audit of critical dependencies

### 16. Codebase Architecture (Weeks-Months)
**Status**: Long-term

- [ ] **TODO**: Break large files into smaller modules
- [ ] **TODO**: Define domain layers (UI / business logic / data access)
- [ ] **TODO**: Add DTOs for API boundaries
- [ ] **TODO**: Consider monorepo structure if projects grow

## 📊 Quality Metrics Targets

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Lint/Type Pass Rate | ~95% | 100% | 🟡 |
| Unit Test Coverage | ~30% | 70-85% | 🔴 |
| E2E Coverage | ~10% | 80% critical flows | 🔴 |
| Exposed Secrets | 1 (removed) | 0 | 🟡 (history cleanup needed) |
| TypeScript `any` usage | High | 0 | 🔴 |
| Security Vulnerabilities | Unknown | 0 high/critical | 🟡 |
| PR Lead Time | Unknown | <48 hours | 🟡 |
| MTTD (Sentry) | Unknown | <5 mins | 🟡 |

## 🎯 Quick Wins (Can Do Today)

1. **Install pre-commit hooks** (5 min)
2. **Add PR template** (15 min)
3. **Enable branch protection** (10 min)
4. **Add CodeQL workflow** (30 min)
5. **Fix test dependency** (`@testing-library/dom`) (15 min)

## 📝 Notes

- Many critical items are already fixed in recent commits
- Focus on credential rotation and history cleanup first
- Test coverage is the biggest gap for quality score improvement
- TypeScript strictness will improve maintainability long-term

---

**Last Updated**: 2024  
**Next Review**: After credential rotation and history cleanup

