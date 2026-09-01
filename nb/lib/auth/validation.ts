/**
 * Authentication validation utilities
 */

/**
 * Validate redirect URL to prevent open redirect attacks
 */
export function validateRedirectUrl(url: string | null | undefined, origin: string): string {
  if (!url) {
    return '/explorer';
  }

  try {
    const redirectUrl = new URL(url, origin);
    
    // Only allow same-origin redirects
    if (redirectUrl.origin !== origin) {
      return '/explorer';
    }

    // Whitelist of allowed paths
    const allowedPaths = [
      '/explorer',
      '/hub',
      '/projects',
      '/profile',
      '/settings',
      '/messages',
      '/notifications',
      '/analytics',
    ];

    // Check if path starts with any allowed path
    const isAllowed = allowedPaths.some(path => redirectUrl.pathname.startsWith(path));
    
    if (!isAllowed) {
      return '/explorer';
    }

    return redirectUrl.pathname + redirectUrl.search;
  } catch {
    // Invalid URL, return default
    return '/explorer';
  }
}

/**
 * Sanitize email input
 */
export function sanitizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize username
 */
export function sanitizeUsername(username: string): string {
  // Remove whitespace and convert to lowercase
  return username.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * Validate username format
 */
export function isValidUsername(username: string): boolean {
  // Username: 3-30 chars, alphanumeric, underscores, hyphens
  const usernameRegex = /^[a-z0-9_-]{3,30}$/;
  return usernameRegex.test(username);
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }
  
  return realIp || 'unknown';
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown';
}
