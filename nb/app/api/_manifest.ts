/**
 * API Route Manifest
 * 
 * This file provides a centralized listing of all API endpoints in the application.
 * It serves as documentation and helps tools discover routes programmatically.
 * 
 * Routes are organized by category:
 * - Auth routes (authentication and authorization)
 * - API v1 routes (versioned API endpoints)
 * - Other routes (utility and helper endpoints)
 */

import type { RouteMetadata } from "@/lib/api/route-metadata";

/**
 * Central manifest of all API routes
 * This array contains route metadata for all endpoints in the application
 */
export const API_ROUTES: RouteMetadata[] = [
  // ============================================
  // Authentication Routes (/api/auth/**)
  // ============================================
  {
    path: '/api/auth/csrf-token',
    methods: ['GET'],
    description: 'Generate CSRF tokens for client-side requests',
    requiresAuth: false,
    rateLimitCategory: 'csrf_token',
  },
  {
    path: '/api/auth/verify-csrf',
    methods: ['POST'],
    description: 'Verify CSRF tokens',
    requiresAuth: false,
  },
  {
    path: '/api/auth/rate-limit',
    methods: ['POST'],
    description: 'Check rate limits for a given identifier and action',
    requiresAuth: false,
  },
  {
    path: '/api/auth/reset-rate-limit',
    methods: ['POST'],
    description: 'Reset rate limits for a given identifier and action',
    requiresAuth: false,
  },
  {
    path: '/api/auth/check-lockout',
    methods: ['POST'],
    description: 'Check if an account is locked out',
    requiresAuth: false,
  },
  {
    path: '/api/auth/validate-password',
    methods: ['POST'],
    description: 'Validate password complexity server-side',
    requiresAuth: false,
    rateLimitCategory: 'password_validation',
  },
  {
    path: '/api/auth/complete-reset',
    methods: ['POST'],
    description: 'Complete password reset by clearing the reset pending cookie',
    requiresAuth: true,
    rateLimitCategory: 'complete_reset',
  },
  {
    path: '/api/auth/check-ip-security',
    methods: ['POST'],
    description: 'Check IP security status',
    requiresAuth: false,
  },
  {
    path: '/api/auth/send-security-notification',
    methods: ['POST'],
    description: 'Send security notifications to users',
    requiresAuth: false,
  },
  {
    path: '/api/auth/record-login',
    methods: ['POST'],
    description: 'Record login attempts for security tracking',
    requiresAuth: false,
  },
  // Passkey routes
  {
    path: '/api/auth/passkeys',
    methods: ['GET'],
    description: 'List all passkeys for the authenticated user',
    requiresAuth: true,
  },
  {
    path: '/api/auth/passkeys/register/options',
    methods: ['POST'],
    description: 'Generate registration options for passkey creation',
    requiresAuth: true,
  },
  {
    path: '/api/auth/passkeys/register/verify',
    methods: ['POST'],
    description: 'Verify and complete passkey registration',
    requiresAuth: true,
  },
  {
    path: '/api/auth/passkeys/authenticate/options',
    methods: ['POST'],
    description: 'Generate authentication options for passkey login',
    requiresAuth: true,
  },
  {
    path: '/api/auth/passkeys/authenticate/verify',
    methods: ['POST'],
    description: 'Verify passkey authentication for logged-in user',
    requiresAuth: true,
  },
  {
    path: '/api/auth/passkeys/login/options',
    methods: ['POST'],
    description: 'Generate authentication options for passkey-first login',
    requiresAuth: false,
  },
  {
    path: '/api/auth/passkeys/login/verify',
    methods: ['POST'],
    description: 'Verify passkey authentication and log in user',
    requiresAuth: false,
  },
  {
    path: '/api/auth/passkeys/[id]',
    methods: ['DELETE'],
    description: 'Remove a passkey for the authenticated user',
    requiresAuth: true,
  },

  // ============================================
  // API v1 Authentication Routes (/api/v1/auth/**)
  // ============================================
  {
    path: '/api/v1/auth/login',
    methods: ['POST'],
    description: 'Authenticate user and create session',
    requiresAuth: false,
    rateLimitCategory: 'login',
  },
  {
    path: '/api/v1/auth/signup',
    methods: ['POST'],
    description: 'Register a new user account',
    requiresAuth: false,
    rateLimitCategory: 'signup',
  },
  {
    path: '/api/v1/auth/logout',
    methods: ['POST'],
    description: 'Log out the current user and destroy session',
    requiresAuth: true,
  },
  {
    path: '/api/v1/auth/refresh',
    methods: ['POST'],
    description: 'Refresh the authentication session',
    requiresAuth: false,
  },
  {
    path: '/api/v1/auth/forgot-password',
    methods: ['POST'],
    description: 'Request a password reset email',
    requiresAuth: false,
  },
  {
    path: '/api/v1/auth/reset-password',
    methods: ['POST'],
    description: 'Reset password using a reset token',
    requiresAuth: false,
  },
  {
    path: '/api/v1/auth/verify-email',
    methods: ['POST'],
    description: 'Verify email address using a verification token',
    requiresAuth: false,
  },
  {
    path: '/api/v1/auth/resend-verification',
    methods: ['POST'],
    description: 'Resend email verification token',
    requiresAuth: true,
  },
  {
    path: '/api/v1/auth/check-email',
    methods: ['POST'],
    description: 'Check if an email address is already registered',
    requiresAuth: false,
  },
  // MFA routes
  {
    path: '/api/v1/auth/mfa/enroll',
    methods: ['POST'],
    description: 'Enroll in multi-factor authentication (TOTP)',
    requiresAuth: true,
  },
  {
    path: '/api/v1/auth/mfa/challenge',
    methods: ['POST'],
    description: 'Generate MFA challenge for AAL2 authentication',
    requiresAuth: true,
  },
  {
    path: '/api/v1/auth/mfa/verify',
    methods: ['POST'],
    description: 'Verify MFA code',
    requiresAuth: true,
  },
  {
    path: '/api/v1/auth/mfa/verify-login',
    methods: ['POST'],
    description: 'Verify MFA code during login',
    requiresAuth: false,
  },

  // ============================================
  // API v1 User Routes (/api/v1/users/**)
  // ============================================
  {
    path: '/api/v1/users/me',
    methods: ['GET', 'PUT', 'PATCH', 'DELETE'],
    description: 'Get, update, or delete the current user profile',
    requiresAuth: true,
  },
  {
    path: '/api/v1/users/me/avatar',
    methods: ['POST', 'DELETE'],
    description: 'Upload or delete user avatar',
    requiresAuth: true,
  },
  {
    path: '/api/v1/users/me/location/guess',
    methods: ['POST'],
    description: 'Guess user location from IP address',
    requiresAuth: true,
  },

  // ============================================
  // API v1 Project Routes (/api/v1/projects/**)
  // ============================================
  {
    path: '/api/v1/projects',
    methods: ['GET', 'POST'],
    description: 'List or create projects',
    requiresAuth: true,
  },
  {
    path: '/api/v1/projects/[id]',
    methods: ['GET', 'PUT', 'DELETE'],
    description: 'Get, update, or delete a project',
    requiresAuth: true,
  },
  {
    path: '/api/v1/projects/[id]/invite',
    methods: ['POST'],
    description: 'Invite users to a project',
    requiresAuth: true,
  },
  {
    path: '/api/v1/projects/[id]/apply',
    methods: ['POST'],
    description: 'Apply to join a project',
    requiresAuth: true,
  },
  {
    path: '/api/projects/[id]/apply',
    methods: ['POST'],
    description: 'Apply to join a project (legacy route)',
    requiresAuth: true,
  },

  // ============================================
  // API v1 Task Routes (/api/v1/tasks/**)
  // ============================================
  {
    path: '/api/v1/tasks',
    methods: ['GET', 'POST'],
    description: 'List or create tasks',
    requiresAuth: true,
  },
  {
    path: '/api/v1/tasks/[id]',
    methods: ['GET', 'PUT', 'PATCH', 'DELETE'],
    description: 'Get, update, or delete a task',
    requiresAuth: true,
  },

  // ============================================
  // API v1 Notification Routes (/api/v1/notifications/**)
  // ============================================
  {
    path: '/api/v1/notifications',
    methods: ['GET'],
    description: 'List notifications for the current user',
    requiresAuth: true,
  },
  {
    path: '/api/v1/notifications/[id]',
    methods: ['GET', 'DELETE'],
    description: 'Get or delete a notification',
    requiresAuth: true,
  },
  {
    path: '/api/v1/notifications/[id]/read',
    methods: ['POST'],
    description: 'Mark a notification as read',
    requiresAuth: true,
  },

  // ============================================
  // API v1 Settings Routes (/api/v1/settings/**)
  // ============================================
  {
    path: '/api/v1/settings/password',
    methods: ['PATCH'],
    description: 'Update user password',
    requiresAuth: true,
  },
  {
    path: '/api/v1/settings/notifications',
    methods: ['GET', 'PATCH'],
    description: 'Get or update notification settings',
    requiresAuth: true,
  },
  {
    path: '/api/v1/settings/sessions',
    methods: ['GET'],
    description: 'List active user sessions',
    requiresAuth: true,
  },
  {
    path: '/api/v1/settings/export-data',
    methods: ['POST'],
    description: 'Export user data',
    requiresAuth: true,
  },

  // ============================================
  // API v1 Admin Routes (/api/v1/admin/**)
  // ============================================
  {
    path: '/api/v1/admin/users',
    methods: ['GET'],
    description: 'List all users (admin only)',
    requiresAuth: true,
    requiredRoles: ['admin'],
  },
  {
    path: '/api/v1/admin/users/[id]',
    methods: ['DELETE'],
    description: 'Delete a user (admin only)',
    requiresAuth: true,
    requiredRoles: ['admin'],
  },
  {
    path: '/api/v1/admin/users/[id]/role',
    methods: ['PUT'],
    description: 'Update user role (admin only)',
    requiresAuth: true,
    requiredRoles: ['admin'],
  },

  // ============================================
  // API v1 Session Routes (/api/v1/sessions/**)
  // ============================================
  {
    path: '/api/v1/sessions',
    methods: ['GET'],
    description: 'List active sessions for current user',
    requiresAuth: true,
  },
  {
    path: '/api/v1/sessions/all',
    methods: ['GET'],
    description: 'List all sessions for current user',
    requiresAuth: true,
  },
  {
    path: '/api/v1/sessions/[id]',
    methods: ['DELETE'],
    description: 'Delete a specific session',
    requiresAuth: true,
  },

  // ============================================
  // API v1 Dashboard Routes (/api/v1/dashboard/**)
  // ============================================
  {
    path: '/api/v1/dashboard/summary',
    methods: ['GET'],
    description: 'Get dashboard summary data',
    requiresAuth: true,
  },
  {
    path: '/api/v1/dashboard/stats',
    methods: ['GET'],
    description: 'Get dashboard statistics',
    requiresAuth: true,
  },
  {
    path: '/api/v1/dashboard/activity',
    methods: ['GET'],
    description: 'Get recent activity for dashboard',
    requiresAuth: true,
  },

  // ============================================
  // API v1 Other Routes
  // ============================================
  {
    path: '/api/v1/health',
    methods: ['GET'],
    description: 'Health check endpoint',
    requiresAuth: false,
  },
  {
    path: '/api/v1/search',
    methods: ['GET'],
    description: 'Search across the platform',
    requiresAuth: false,
  },
  {
    path: '/api/v1/upload',
    methods: ['POST'],
    description: 'Upload files',
    requiresAuth: true,
  },
  {
    path: '/api/v1/images/upload',
    methods: ['POST'],
    description: 'Upload images',
    requiresAuth: true,
  },
  {
    path: '/api/v1/export/[entity]',
    methods: ['GET'],
    description: 'Export data for a specific entity',
    requiresAuth: true,
  },
  {
    path: '/api/v1/geo/reverse',
    methods: ['GET'],
    description: 'Reverse geocode coordinates to location',
    requiresAuth: false,
  },
  {
    path: '/api/v1/project-invitations/[id]/accept',
    methods: ['POST'],
    description: 'Accept a project invitation',
    requiresAuth: true,
  },
  {
    path: '/api/v1/project-invitations/[id]/decline',
    methods: ['POST'],
    description: 'Decline a project invitation',
    requiresAuth: true,
  },
  {
    path: '/api/v1/project-invitations/[id]/cancel',
    methods: ['POST'],
    description: 'Cancel a project invitation',
    requiresAuth: true,
  },

  // ============================================
  // Other API Routes (non-v1)
  // ============================================
  {
    path: '/api/link-preview',
    methods: ['GET'],
    description: 'Get link preview metadata',
    requiresAuth: false,
    queryParams: ['url'],
  },
  {
    path: '/api/unfurl',
    methods: ['GET'],
    description: 'Unfurl URLs and extract Open Graph metadata',
    requiresAuth: false,
    queryParams: ['url'],
  },
  {
    path: '/api/trending-hashtags',
    methods: ['GET'],
    description: 'Get trending hashtags',
    requiresAuth: false,
    queryParams: ['hours', 'limit'],
  },
  {
    path: '/api/translate',
    methods: ['POST'],
    description: 'Translate text using external translation service',
    requiresAuth: false,
  },
  {
    path: '/api/video-thumbnail',
    methods: ['POST'],
    description: 'Generate thumbnail from video',
    requiresAuth: true,
  },
  {
    path: '/api/messages/send',
    methods: ['POST'],
    description: 'Send a message',
    requiresAuth: true,
  },
  {
    path: '/api/messages/edit',
    methods: ['PUT'],
    description: 'Edit a message',
    requiresAuth: true,
  },
  {
    path: '/api/messages/delete',
    methods: ['DELETE'],
    description: 'Delete a message',
    requiresAuth: true,
  },
  {
    path: '/api/messages/upload',
    methods: ['POST'],
    description: 'Upload file for message',
    requiresAuth: true,
  },
  {
    path: '/api/messages/mark-delivered',
    methods: ['POST'],
    description: 'Mark message as delivered',
    requiresAuth: true,
  },
  {
    path: '/api/messages/validate',
    methods: ['POST'],
    description: 'Validate message content',
    requiresAuth: true,
  },
  {
    path: '/api/applications/[id]/handle',
    methods: ['POST'],
    description: 'Handle a project application (accept/reject)',
    requiresAuth: true,
  },
];

/**
 * Get all routes by method
 */
export function getRoutesByMethod(method: string): RouteMetadata[] {
  return API_ROUTES.filter(route => route.methods.includes(method as any));
}

/**
 * Get all routes that require authentication
 */
export function getAuthenticatedRoutes(): RouteMetadata[] {
  return API_ROUTES.filter(route => route.requiresAuth === true);
}

/**
 * Get all public routes (no authentication required)
 */
export function getPublicRoutes(): RouteMetadata[] {
  return API_ROUTES.filter(route => route.requiresAuth === false);
}

/**
 * Get routes by path pattern
 */
export function getRoutesByPath(pattern: string): RouteMetadata[] {
  return API_ROUTES.filter(route => route.path.includes(pattern));
}

/**
 * Get route by exact path and method
 */
export function getRoute(path: string, method: string): RouteMetadata | undefined {
  return API_ROUTES.find(route => route.path === path && route.methods.includes(method as any));
}
