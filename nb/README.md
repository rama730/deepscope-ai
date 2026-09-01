# Network Builders (NB) Platform

A monolithic social platform for creators, builders, and collaborators.

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- pnpm (recommended) or npm
- Supabase Project

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/your-org/nb.git
    cd nb
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    pnpm install
    ```
3.  Set up environment variables:
    ```bash
    cp .env.example .env.local
    ```

### Development
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

## 🛠 Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Styling**: Tailwind CSS
- **Monitoring**: Sentry
- **Deployment**: Vercel

## 🔐 Environment Variables

### Core
| Variable | Description |
| - | - |
| `NEXT_PUBLIC_APP_ENV` | `development` (default), `staging`, or `production`. Controls logging and feature flags. |
| `NEXT_PUBLIC_SITE_URL` | Base URL of the application. |

### Supabase
| Variable | Description |
| - | - |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from Supabase Settings. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public API key. Safe for client-side. |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRET**. Server-only key for admin tasks. |

### Monitoring (Sentry)
| Variable | Description |
| - | - |
| `NEXT_PUBLIC_SENTRY_DSN` | Data Source Name for error tracking. |
| `SENTRY_AUTH_TOKEN` | (Build time only) For uploading source maps. |

## 📦 Deployment

### Vercel (Recommended)
1.  Import project from GitHub.
2.  Add Environment Variables in Vercel Project Settings.
3.  **Important**: Set `NEXT_PUBLIC_APP_ENV` to `production` for the Production Environment and `staging` for Preview Environments.

### Database Migrations
Database changes are managed via Supabase Migrations.
```bash
# Apply migrations to remote database
supabase db push
```

## 🛡 Security & Performance
- **Rate Limiting**: API routes are protected by a custom Postgres-backed rate limiter.
- **Indexes**: Core tables (`projects`, `tasks`, `profiles`) are indexed for performance.
- **Monitoring**: Sentry tracks errors and performance vitals in real-time.

## 🔑 Passkey (WebAuthn) Login
This project supports **Passkey-first login** (Face ID / Touch ID / Windows Hello) in addition to email/password.

- **Enroll passkeys**: `Settings → Security → Passkeys` (requires a signed-in session)
- **Sign in with passkey**: `/login → “Sign in with Passkey”`

### Requirements
- `SUPABASE_SERVICE_ROLE_KEY` must be set (server-only). This is used to mint a short-lived Supabase `token_hash` after WebAuthn verification and exchange it for a real session cookie.
- Apply migrations:
  - `0094_passkey_credentials.sql` (passkey storage)
  - `0095_login_history_rls.sql` (fixes `login_history` select permissions)

## 📚 API Documentation

The application provides a RESTful API with endpoints organized into several categories. All endpoints follow consistent patterns and response formats.

### API Structure

- **Base URL**: `/api`
- **Versioned API**: `/api/v1`
- **Authentication**: Most endpoints require authentication via session cookies or Bearer tokens

### Route Organization

#### Authentication Routes (`/api/auth/**`)
- CSRF token management
- Rate limiting utilities
- Security checks
- Passkey (WebAuthn) authentication

#### Version 1 API Routes (`/api/v1/**`)
- **Auth** (`/api/v1/auth/**`): User authentication, registration, password management
- **Users** (`/api/v1/users/**`): User profile management
- **Projects** (`/api/v1/projects/**`): Project creation, management, and collaboration
- **Tasks** (`/api/v1/tasks/**`): Task management
- **Notifications** (`/api/v1/notifications/**`): Notification management
- **Settings** (`/api/v1/settings/**`): User settings and preferences
- **Admin** (`/api/v1/admin/**`): Administrative endpoints (admin only)
- **Dashboard** (`/api/v1/dashboard/**`): Dashboard data and statistics

#### Utility Routes (`/api/**`)
- Link preview generation
- Hashtag trending
- Translation services
- File uploads

### Route Metadata

All routes include standardized metadata for better tooling support:

```typescript
export const ROUTE_METADATA = {
  path: '/api/v1/users/me',
  methods: ['GET', 'PUT', 'PATCH', 'DELETE'],
  description: 'Get, update, or delete the current user profile',
  requiresAuth: true,
  // ... additional metadata
};
```

### API Manifest

A centralized API manifest is available at `app/api/_manifest.ts` that lists all endpoints programmatically. This helps with:
- Code analysis tools
- API documentation generation
- Endpoint discovery
- Testing automation

```typescript
import { API_ROUTES, getRoutesByMethod, getAuthenticatedRoutes } from '@/app/api/_manifest';

// Get all GET endpoints
const getRoutes = getRoutesByMethod('GET');

// Get all authenticated routes
const protectedRoutes = getAuthenticatedRoutes();
```

### Response Format

All API responses follow a standardized format:

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Error message",
  "error": {
    "statusCode": 400,
    "code": "VALIDATION_ERROR",
    "details": { ... }
  }
}
```

### Authentication

Most endpoints require authentication. The application uses Supabase Auth with session cookies. To authenticate:

1. Use `/api/v1/auth/login` or `/api/v1/auth/signup` to establish a session
2. Include session cookies in subsequent requests
3. For API-only access, use Bearer tokens when supported

### Rate Limiting

Many endpoints are protected by rate limiting. Rate limits are applied based on:
- IP address (for public endpoints)
- User ID (for authenticated endpoints)
- Action type (specific rate limits per action)

Rate limit responses include `Retry-After` headers indicating when to retry.

### Common Endpoints

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/v1/health` | GET | No | Health check |
| `/api/v1/auth/login` | POST | No | User login |
| `/api/v1/auth/signup` | POST | No | User registration |
| `/api/v1/users/me` | GET | Yes | Get current user profile |
| `/api/v1/projects` | GET | Yes | List projects |
| `/api/v1/projects` | POST | Yes | Create project |

For a complete list of all endpoints, see `app/api/_manifest.ts` or refer to individual route files in `app/api/**/route.ts`.

### Route Discovery

Routes are defined using Next.js App Router conventions:
- Route files: `app/api/**/route.ts`
- HTTP methods: `export const GET`, `export const POST`, etc.
- Route metadata: Each route exports `ROUTE_METADATA` constant

Tools can discover routes by:
1. Scanning `app/api/**/route.ts` files
2. Reading `ROUTE_METADATA` exports
3. Importing `API_ROUTES` from `app/api/_manifest.ts`

## 🧪 Testing & Quality
- **Type Check**: `npm run type-check`
- **Lint**: `npm run lint`
- **Tests**: `npm run test`

The CI pipeline (`.github/workflows/ci.yml`) runs these checks on every Pull Request.
