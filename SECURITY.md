# Security Policy

The security of our application, infrastructure, and user data is our highest priority. We appreciate the invaluable contributions of security researchers and engineers in maintaining a robust, trustworthy, and safe ecosystem.

---

## 1. Supported Versions

We provide security patches, automated vulnerability scanning, and hotfixes exclusively for actively maintained releases.

| Version | Supported | Security Maintenance Status |
| :--- | :---: | :--- |
| `main` / `latest` | :white_check_mark: | Active security updates & continuous integration scans |
| `< latest` | :x: | End of Life (EOL) — Please upgrade to latest |

---

## 2. Reporting a Vulnerability

If you believe you have discovered a security vulnerability or security bug, please report it immediately and responsibly.

### Responsible Reporting Guidelines
- **DO NOT** open public issues, discussions, or pull requests for security vulnerabilities.
- **DO NOT** attempt to access, modify, or destroy user data or degrade system performance.
- **DO NOT** execute denial-of-service (DoS/DDoS) attacks against production infrastructure.

### Reporting Channels

1. **GitHub Private Vulnerability Advisory (Recommended)**:
   Submit an advisory report directly via [GitHub Security Advisories](https://github.com/rama730/nb-s/security/advisories/new).
2. **Security Team Direct Contact**:
   For sensitive or urgent disclosures, report via GitHub Private Vulnerability Reporting or reach out to repository administrators.

### What to Include in Your Report

To help us triage and resolve the issue quickly, please provide:
- **Summary**: Concise description of the vulnerability and its potential impact.
- **Type/CWE**: Classification (e.g., Broken Access Control, SQL Injection, RLS Bypass, SSRF, XSS).
- **Environment**: Affected branch, commit hash, component, or URL endpoint.
- **Reproduction Steps**: Detailed, minimal step-by-step reproduction instructions.
- **Proof of Concept (PoC)**: Sample script, cURL command, or screenshots.
- **Remediation Suggestions**: Any proposed patches or mitigation measures (if available).

---

## 3. Vulnerability Response & SLA Matrix

All reports receive prompt attention according to our severity-based Service Level Agreement (SLA):

| Severity | Example Scenarios | Initial Triage | Target Fix / Patch |
| :--- | :--- | :---: | :---: |
| **Critical** | RCE, SQLi, Auth Bypass, Direct DB credential leak, RLS circumvention | < 24 hours | 1 – 3 days |
| **High** | Privilege Escalation, Sensitive Data Exposure, SSRF, Account Takeover | < 48 hours | 3 – 7 days |
| **Medium** | Stored/Reflected XSS, CSRF with state impact, Rate limit evasion | < 72 hours | 1 – 2 weeks |
| **Low / Informational** | Best practice deviation, verbose error messages, non-sensitive leakage | < 7 days | Next release cycle |

---

## 4. Coordinated Disclosure Process

We follow standard Coordinated Vulnerability Disclosure (CVD):

1. **Receipt & Acknowledgment**: We acknowledge receipt of your report within the SLA window.
2. **Investigation & Triage**: Our security team validates the issue and assigns a severity rating (CVSS).
3. **Patch Development & Testing**: A fix is developed in a private security branch.
4. **Deployment & Verification**: The patch is deployed to staging and production environments.
5. **Public Advisory & Credit**: A public advisory is published, and you will be credited in our Release Notes and Security Hall of Fame (unless anonymity is requested).

---

## 5. Architectural Security Guidelines (1M+ Scale Readiness)

To ensure resilient and smooth operation under high concurrent traffic (1,000,000+ users), our architecture enforces strict security and performance standards:

### 5.1 Identity & Database Access Control
- **Strict Row-Level Security (RLS)**: Every Supabase / PostgreSQL table must have RLS enabled with explicit policies (`RESTRICTIVE` / `PERMISSIVE`).
- **Service Role Key Isolation**:
  - `SUPABASE_SERVICE_ROLE_KEY` must **never** be exposed to browser runtimes or prefixed with `NEXT_PUBLIC_`.
  - Service role keys must only be utilized within isolated server-side processes or Edge Functions.
- **Connection Pooler Protection**:
  - Always route high-volume connections through Supavisor / PgBouncer with SSL enabled.
  - Never commit pooler connection strings or raw database URIs to source control.

### 5.2 Defense in Depth & High-Scale Infrastructure
- **Rate Limiting & Abuse Prevention**: Edge rate limiting to prevent brute force, scraping, and resource exhaustion attacks.
- **Zero-Trust Secret Management**:
  - Secrets are managed via encrypted environment variables.
  - Automated pre-commit hooks (`detect-secrets`, `check-env-files`) prevent credential leaks before commit.
- **Strict Content Security Policy (CSP)**:
  - Enforce modern HTTP security headers (`Strict-Transport-Security`, `X-Content-Type-Options`, `Content-Security-Policy`, `Referrer-Policy`).

---

## 6. Contributor Security Checklist

Before opening a pull request, ensure:
- [ ] No secrets, API keys, tokens, or private credentials exist in git commits or history.
- [ ] `.env*` files (except `.env.example`) are excluded via `.gitignore`.
- [ ] All database queries enforce parameterized bindings to prevent SQL injection.
- [ ] Any new API endpoint validates authorization and input data schemas.
- [ ] Pre-commit hooks pass cleanly (`pre-commit run --all-files`).

---

## 7. Security Advisories & History

Historical security advisories and remediation actions are tracked under:
- [GitHub Security Advisories](https://github.com/rama730/nb-s/security/advisories)
- [`SECURITY_REMEDIATION.md`](./SECURITY_REMEDIATION.md) (Credential rotation & history purge guidance)

---

*Last Reviewed: October 2026*
