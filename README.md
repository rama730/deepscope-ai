# NetworkBase (NB)

> Enterprise-Grade Social and Collaboration Engine for Creators, Builders, and Teams. Engineered for extreme concurrency, sub-second latency, and resilience at scale.

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%26%20Auth-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Security](https://img.shields.io/badge/Security-CodeQL%20Passed-brightgreen?style=flat-square&logo=github)](https://github.com/)

---

## Table of Contents

- [Overview](#overview)
- [Architecture for 1 Million+ Concurrent Users](#architecture-for-1-million-concurrent-users)
  - [Fast Loading Engine](#1-fast-loading-engine)
  - [Fast Uploading and Media Processing](#2-fast-uploading-and-media-processing)
  - [Fast Showing and Virtualized Rendering](#3-fast-showing-and-virtualized-rendering)
  - [Database and Concurrency Hardening](#4-database-and-concurrency-hardening)
- [Core Features](#core-features)
- [Repository Structure](#repository-structure)
- [Quick Start Guide](#quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Migrations](#database-migrations)
  - [Running the Application](#running-the-application)
- [Development and Testing](#development-and-testing)
  - [Quality and Linting Scripts](#quality-and-linting-scripts)
  - [Test Suite](#test-suite)
  - [Pre-Commit Hooks Setup](#pre-commit-hooks-setup)
- [API Architecture and Routing](#api-architecture-and-routing)
  - [Standard API Response Envelope](#standard-api-response-envelope)
  - [Key API Endpoints](#key-api-endpoints)
  - [Programmatic Route Discovery](#programmatic-route-discovery)
- [Security and Compliance](#security-and-compliance)
- [Contributing and Governance](#contributing-and-governance)
- [License](#license)

---

## Overview

NetworkBase (NB) is a high-performance web platform built to connect creators, developers, and project builders into synchronized, collaborative workspaces.

Designed from the ground up to solve the responsiveness and scalability challenges of modern social applications, NetworkBase provides instant page delivery, seamless real-time activity updates, hardware-backed biometric passkey authentication, and client-side processing pipelines that keep servers lightweight and responsive.

---

## Architecture for 1 Million+ Concurrent Users

To maintain sub-100ms response times and 60 FPS interactions when 1,000,000+ people use the platform simultaneously, NetworkBase implements a four-tier performance architecture:

```
+-------------------------------------------------------------------------+
|                         Global Edge CDN Layer                           |
|       (Asset Caching, Edge Middleware, Geo-Distributed Routing)        |
+------------------------------------+------------------------------------+
                                     |
                                     v
+-------------------------------------------------------------------------+
|                  Next.js 16 + React 19 Core Engine                      |
|   * React Server Components (RSC)     * Turbopack Optimization          |
|   * React Compiler Auto-Memoization   * Streaming HTML Architecture     |
+------------------+----------------------------------+-------------------+
                   |                                  |
                   v                                  v
+-------------------------------------+  +--------------------------------+
|      Client-Side Offload Engine     |  |     Distributed Data Tier      |
|  * Resumable TUS Chunked Uploads    |  |  * Supabase Connection Pooling |
|  * Client WebAssembly (FFmpeg WASM) |  |  * Postgres RLS Policy Checks  |
|  * Browser-Level Image Compression  |  |  * Composite B-Tree Indexing   |
|  * React-Virtuoso Infinite Feeds    |  |  * Token-Bucket Rate Limiting  |
|  * TanStack Query Optimistic Cache  |  |  * Real-Time WebSocket Feeds   |
+-------------------------------------+  +--------------------------------+
```

### 1. Fast Loading Engine
- **React Server Components (RSC)**: Non-interactive UI components are rendered directly on the server edge, delivering lightweight zero-bundle-size HTML.
- **Turbopack Compiler**: Sub-second compilation and instantaneous Hot Module Replacement (HMR).
- **Intelligent Route Prefetching**: Links inside the viewport are automatically prefetched, resulting in zero-delay navigation between project workspaces, tasks, and profile pages.

### 2. Fast Uploading and Media Processing
- **Client-Side Offload**: Large media files (videos, audio, images) are compressed directly on the user's device via client-side WebAssembly (`@ffmpeg/ffmpeg`) and browser compression before transmission.
- **TUS Chunked Resumable Uploads**: Upload streams bypass central application servers and go directly to cloud object storage in chunked, fault-tolerant packets (`tus-js-client`), preventing memory bottlenecks on the application cluster.
- **Background Synchronization**: IndexedDB key-value caching (`idb-keyval`) ensures uploads survive network drops and page reloads.

### 3. Fast Showing and Virtualized Rendering
- **DOM Virtualization with React Virtuoso**: Infinite feeds and task lists render only items currently within the active viewport, ensuring smooth 60 FPS scrolling whether a feed contains 10 items or 50,000 items.
- **Optimistic UI Updates**: TanStack Query v5 and Zustand update client state instantaneously on likes, comments, and status edits prior to remote database confirmation, rolling back gracefully if network failures occur.
- **Dynamic Skeletons and Spinners**: Instant loading skeletons prevent layout shift (CLS = 0) and provide immediate user feedback across all views.

### 4. Database and Concurrency Hardening
- **Connection Pooling**: Transaction-level PgBouncer pooling prevents database connection exhaustion under massive spike loads.
- **Postgres Rate Limiting**: Built-in token-bucket rate limiting restricts abusive endpoints at the database level.
- **Row-Level Security (RLS)**: Enforces access control within the PostgreSQL engine, eliminating redundant server-side authorization overhead.

---

## Core Features

- **Biometric Passkey Authentication**: Hardware-backed FIDO2 / WebAuthn passwordless authentication (Face ID, Touch ID, Windows Hello) alongside traditional email/password credentials.
- **Dynamic Project Workspaces**: Create, organize, and showcase software projects with custom badges, milestones, contributor roles, and rich media assets.
- **Task and Milestone Pipeline**: Real-time task board with status tracking, assignees, deadlines, and granular permission controls.
- **Rich Text Authoring**: Fully customizable WYSIWYG editor built on Tiptap supporting links, formatting, task lists, and syntax highlighting.
- **Real-Time Notification Hub**: Toast notification system powered by Sonner, transactional emails via Resend, and browser push notifications.
- **Theme and Accessibility Engine**: Fluid light/dark themes powered by `next-themes`, ARIA-compliant primitives, and high-contrast accessibility standards.

---

## Repository Structure

```
.
|-- .github/
|   |-- workflows/                # CI/CD pipelines, CodeQL security, secret scanning
|   |-- ISSUE_TEMPLATE/           # Bug reports and feature request templates
|   `-- PULL_REQUEST_TEMPLATE.md  # Standard pull request checklist
|-- .pre-commit-config.yaml       # Pre-commit secret scanning and formatting hooks
|-- CONTRIBUTING.md               # Guidelines for contributing to NetworkBase
|-- SECURITY.md                   # Security vulnerability reporting policy
|-- QUALITY_ROADMAP.md            # Architecture roadmap and quality metrics
`-- nb/                           # Main Next.js Application
    |-- app/                      # Next.js App Router root
    |   |-- (auth)/               # Login, registration, passkey authentication
    |   |-- (main)/               # Dashboard, projects, tasks, profile, settings
    |   |-- api/                  # Versioned API routes (/api/v1/**)
    |   |   |-- _manifest.ts      # Programmatic API route registry
    |   |   `-- v1/               # Health, auth, user, project, task endpoints
    |   `-- layout.tsx            # Global root layout with providers
    |-- components/               # Modular UI component hierarchy
    |   |-- common/               # Loading skeletons, modals, toasts, buttons
    |   |-- profile/              # User profiles, privacy controls, passkey management
    |   `-- projects/             # Project cards, creation forms, next-steps modals
    |-- hooks/                    # Reusable React hooks (useToast, useAuth, etc.)
    |-- lib/                      # Supabase clients, rate limiters, auth utilities
    |-- public/                   # Static assets, branding, and icons
    |-- styles/                   # Global CSS and Tailwind definitions
    |-- types/                    # TypeScript types and database schema interfaces
    `-- package.json              # Application dependencies and scripts
```

---

## Quick Start Guide

### Prerequisites

- **Node.js**: `v20.x` or higher
- **Package Manager**: `pnpm` (recommended) or `npm`
- **Database**: Active Supabase project (PostgreSQL 15+)
- **Python 3**: (Optional) For automated git pre-commit hooks

### Installation

1. Clone the repository and navigate to the application folder:
   ```bash
   git clone https://github.com/your-org/nb.git
   cd nb/nb
   ```

2. Install dependencies:
   ```bash
   pnpm install
   # or
   npm install
   ```

### Environment Variables

Copy the example environment configuration:
```bash
cp .env.example .env.local
```

Configure your environment variables in `.env.local`:

```env
# Application Settings
NEXT_PUBLIC_APP_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key

# Error Tracking and Performance (Optional)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-build-token
```

### Database Migrations

Push the database schema and RLS policies to your Supabase instance:
```bash
supabase db push
```

### Running the Application

Launch the Turbopack development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Development and Testing

### Quality and Linting Scripts

```bash
# Linting
pnpm lint             # Check for ESLint warnings and errors
pnpm lint:fix         # Automatically fix lint issues

# Formatting
pnpm format           # Format code with Prettier
pnpm format:check     # Verify formatting standards

# Static Type Verification
pnpm type-check       # Run TypeScript compiler check without emitting files
```

### Test Suite

```bash
# Unit and Integration Tests (Jest)
pnpm test             # Run all Jest tests
pnpm test:watch       # Run tests in interactive watch mode
pnpm test:coverage    # Generate code coverage report

# End-to-End Tests (Playwright)
pnpm test:e2e         # Execute headless browser tests
pnpm test:ui          # Open interactive Playwright test dashboard
```

### Pre-Commit Hooks Setup

NetworkBase uses `pre-commit` to prevent committing secrets, trailing whitespace, or unformatted files:

```bash
# Install pre-commit tool
pip install pre-commit

# Install git hooks into local repository
pre-commit install

# Manually execute against all files
pre-commit run --all-files
```

---

## API Architecture and Routing

All server endpoints are organized in the Next.js App Router under `/api/v1/`.

### Standard API Response Envelope

Every API response follows a consistent structure for predictable client handling:

**Success Response (`HTTP 200 / 201`):**
```json
{
  "success": true,
  "data": {
    "id": "proj_98a76b5c",
    "name": "NetworkBase Engine",
    "status": "active"
  }
}
```

**Error Response (`HTTP 4xx / 5xx`):**
```json
{
  "success": false,
  "message": "Invalid request parameters provided.",
  "error": {
    "statusCode": 400,
    "code": "VALIDATION_ERROR",
    "details": {
      "field": "title",
      "reason": "Title must be at least 3 characters."
    }
  }
}
```

### Key API Endpoints

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/v1/health` | No | System health check and uptime status |
| `POST` | `/api/v1/auth/login` | No | Authenticate user session with credentials |
| `POST` | `/api/v1/auth/signup` | No | Register a new user account |
| `POST` | `/api/v1/auth/passkey` | No | Verify WebAuthn passkey assertion |
| `GET` | `/api/v1/users/me` | Yes | Fetch profile details for authenticated user |
| `GET` | `/api/v1/projects` | Yes | List workspaces and projects with pagination |
| `POST` | `/api/v1/projects` | Yes | Create a new project workspace |
| `GET` | `/api/v1/tasks` | Yes | Retrieve tasks associated with active projects |
| `POST` | `/api/v1/tasks` | Yes | Create and assign a project task |

### Programmatic Route Discovery

NetworkBase exports a centralized API manifest at `nb/app/api/_manifest.ts` allowing automated tooling, test runners, and SDK generators to discover routes programmatically:

```typescript
import { API_ROUTES, getRoutesByMethod, getAuthenticatedRoutes } from '@/app/api/_manifest';

// Query registered routes
const allGetEndpoints = getRoutesByMethod('GET');
const protectedRoutes = getAuthenticatedRoutes();
```

---

## Security and Compliance

- **Zero Hardcoded Credentials**: Automated scans via TruffleHog and Yelp detect-secrets run on each pull request.
- **Row-Level Security (RLS)**: Enforced across all Supabase database tables to isolate tenant and user data.
- **Static Code Analysis**: Automated CodeQL security analysis runs on every push to detect common web vulnerabilities (CWE/OWASP Top 10).
- **Input Sanitization**: Client and server-side sanitization using `isomorphic-dompurify` prevents XSS injection.

For full security protocols, see [SECURITY.md](SECURITY.md).

---

## Contributing and Governance

Contributions are what make the open-source and builder community such an amazing place to learn, inspire, and create. Any contributions you make are greatly appreciated.

1. Review [CONTRIBUTING.md](CONTRIBUTING.md) for branch naming and commit conventions.
2. Fork the project.
3. Create your feature branch (`git checkout -b feature/high-performance-cache`).
4. Commit your changes (`git commit -m 'feat: add high performance cache'`).
5. Ensure all tests and linting pass (`pnpm test && pnpm lint`).
6. Push to the branch (`git push origin feature/high-performance-cache`).
7. Open a Pull Request.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
