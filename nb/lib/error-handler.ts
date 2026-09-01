/**
 * Error handling utilities to reduce console noise
 * Suppresses expected errors and logs only important ones
 */

/**
 * Check if an error should be suppressed (not logged)
 */
export function shouldSuppressError(error: any, url?: string): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString();
  const errorCode = error.code || error.status || error.statusCode;
  
  // Suppress 406 errors for Supabase (content negotiation issues)
  // These are common when Supabase client makes requests without proper Accept headers
  if (errorCode === 406 || errorCode === '406') {
    return true;
  }
  
  // Suppress 403 errors for certain endpoints (permission issues that are expected)
  if (errorCode === 403 || errorCode === '403') {
    if (url) {
      const suppressedEndpoints = [
        '/post_reposts',
        '/bookmarks',
        '/post_likes',
        '/experiences',
        '/muted_words',
        '/skills',
        '/user_preferences'
      ];
      
      if (suppressedEndpoints.some(endpoint => url.includes(endpoint))) {
        return true;
      }
    }
  }
  
  // Suppress 400 errors for certain endpoints (validation errors that are expected)
  if (errorCode === 400 || errorCode === '400') {
    if (url?.includes('/projects') && errorMessage?.includes('No projects found')) {
      return true;
    }
  }
  
  // Suppress CSP violations in development (we'll fix them, but don't spam console)
  if (process.env.NODE_ENV === 'development') {
    if (errorMessage.includes('Content Security Policy') || 
        errorMessage.includes('CSP')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Log error only if it shouldn't be suppressed
 */
export function logError(error: any, context?: string, url?: string) {
  if (shouldSuppressError(error, url)) {
    return;
  }
  
  if (context) {
    console.error('[', context, ']', error);
  } else {
    console.error(error);
  }
}

/**
 * Log warning for suppressed errors (only in development)
 */
export function logSuppressedError(error: any, context?: string, url?: string) {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  if (shouldSuppressError(error, url)) {
    const errorCode = error.code || error.status || error.statusCode;
    if (context) {
      console.debug('[', context, '] Suppressed error', errorCode, ':', url || error.message);
    } else {
      console.debug('Suppressed error', errorCode, ':', url || error.message);
    }
  }
}

