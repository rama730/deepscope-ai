# Security Policy

## Supported Versions

We actively support security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < Latest| :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability, please follow these steps:

### 1. **Do NOT** create a public GitHub issue

Security vulnerabilities should be reported privately to prevent exploitation.

### 2. Report the vulnerability

Please email security concerns to: **security@yourdomain.com**

Alternatively, if you have access to the repository, you can use GitHub's [Private Vulnerability Reporting](https://github.com/your-org/nb-s/security/advisories/new) feature.

### 3. Include the following information

- Type of vulnerability (e.g., XSS, SQL injection, authentication bypass)
- Full paths of source file(s) related to the vulnerability
- Location of the affected code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability

### 4. Response timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity (see below)

### 5. Disclosure policy

- We will acknowledge receipt of your report within 48 hours
- We will keep you informed of our progress
- We will notify you when the vulnerability is fixed
- We will credit you in the security advisory (unless you prefer to remain anonymous)

## Severity Levels

### Critical
- Remote code execution
- SQL injection
- Authentication bypass
- Unauthorized access to sensitive data

**Response Time**: 24-48 hours  
**Fix Timeline**: 1-7 days

### High
- Privilege escalation
- Cross-site scripting (XSS) with data exfiltration
- CSRF with significant impact
- Insecure direct object references

**Response Time**: 48-72 hours  
**Fix Timeline**: 1-2 weeks

### Medium
- Information disclosure
- CSRF without significant impact
- Rate limiting bypass
- Missing security headers

**Response Time**: 1 week  
**Fix Timeline**: 2-4 weeks

### Low
- Best practice violations
- Missing security headers (non-critical)
- Information leakage (non-sensitive)

**Response Time**: 2 weeks  
**Fix Timeline**: 1-2 months

## Security Best Practices

### For Contributors

- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive configuration
- Review code for security issues before submitting PRs
- Follow the principle of least privilege
- Keep dependencies up to date

### For Users

- Keep your Supabase service role key secure and never expose it client-side
- Use strong, unique passwords
- Enable MFA when available
- Regularly review and rotate API keys
- Monitor your application logs for suspicious activity

## Known Security Considerations

### Service Role Keys

**CRITICAL**: The `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed to the client. It bypasses Row Level Security (RLS) and grants full database access.

- ✅ Use `SUPABASE_SERVICE_ROLE_KEY` (server-only) in API routes
- ❌ Never use `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` (this would expose it to clients)

### Environment Variables

All sensitive environment variables are documented in the README. Ensure:
- `.env.local` is in `.gitignore`
- Never commit `.env` files
- Use secure secret management in production (e.g., Vercel Environment Variables)

### Database Security

- All tables use Row Level Security (RLS) policies
- Service role key is only used in server-side API routes
- User authentication is handled via Supabase Auth

## Security Updates

Security updates will be announced via:
- GitHub Security Advisories
- Release notes
- Email notifications (for critical vulnerabilities)

## Acknowledgments

We appreciate the security research community's efforts to help keep our platform secure. Contributors who report valid security vulnerabilities will be credited (unless they prefer to remain anonymous).

---

**Last Updated**: 2024

