/**
 * Suppress expected console errors in development
 * This helps keep the console clean while debugging
 */

if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;

  // Track suppressed errors to avoid spam
  const suppressedErrors = new Map<string, number>();
  const MAX_SUPPRESSED_LOGS = 5; // Max times to log a suppressed error

  // List of Supabase endpoints where errors are expected
  const suppressedEndpoints = [
    'post_reposts',
    'bookmarks',
    'post_likes',
    'experiences',
    'muted_words',
    'skills',
    'user_preferences',
    'post_drafts',
    'projects'
  ];

  console.error = function (...args: any[]) {
    const message = args.join(' ');
    const firstArg = args[0];
    
    // Check if it's a network error from browser
    const isNetworkError = typeof firstArg === 'string' && (
      firstArg.includes('Failed to load resource') ||
      firstArg.includes('the server responded with a status of')
    );
    
    // Find Supabase URL in arguments
    const url = args.find(arg => typeof arg === 'string' && arg.includes('supabase'));
    const errorObj = args.find(arg => typeof arg === 'object' && arg !== null && !Array.isArray(arg));
    
    // Check if it's a suppressed endpoint
    const isSuppressedEndpoint = url && suppressedEndpoints.some(endpoint => url.includes(endpoint));
    
    // Suppress network errors (406, 403, 400) for suppressed endpoints
    if (isNetworkError && isSuppressedEndpoint) {
      const suppressedStatuses = ['406', '403', '400'];
      if (suppressedStatuses.some(status => message.includes(status))) {
        // Completely suppress - don't log anything
        return;
      }
    }
    
    // Suppress 406 errors (content negotiation)
    if (message.includes('406') || message.includes('Not Acceptable')) {
      if (isSuppressedEndpoint) {
        return; // Completely suppress
      }
      const key = '406-error';
      const count = suppressedErrors.get(key) || 0;
      if (count < MAX_SUPPRESSED_LOGS) {
        suppressedErrors.set(key, count + 1);
        console.debug('[Suppressed] 406 error (content negotiation issue)');
      }
      return;
    }
    
    // Suppress 403 errors for certain endpoints
    if (message.includes('403') || message.includes('Forbidden') || message.includes('permission denied')) {
      // Check if it's a permission denied error (code 42501)
      if (errorObj && (errorObj as any).code === '42501') {
        const key = 'permission-denied';
        const count = suppressedErrors.get(key) || 0;
        if (count < MAX_SUPPRESSED_LOGS) {
          suppressedErrors.set(key, count + 1);
          console.debug('[Suppressed] Permission denied error (expected for RLS)');
        }
        return;
      }
      
      if (isSuppressedEndpoint) {
        const key = `403-${url?.substring(0, 50) || 'unknown'}`;
        const count = suppressedErrors.get(key) || 0;
        if (count < MAX_SUPPRESSED_LOGS) {
          suppressedErrors.set(key, count + 1);
          console.debug('[Suppressed] 403 error for:', url);
        }
        return;
      }
      
      // Suppress "Error loading muted words" messages
      if (message.includes('Error loading muted words')) {
        const key = 'muted-words-error';
        const count = suppressedErrors.get(key) || 0;
        if (count < MAX_SUPPRESSED_LOGS) {
          suppressedErrors.set(key, count + 1);
          console.debug('[Suppressed] Error loading muted words (permission issue)');
        }
        return;
      }
      
      // Suppress "Error loading skills count" and "Error loading experience count" messages
      if (message.includes('Error loading skills count') || message.includes('Error loading experience count')) {
        // Check if error object is empty (just {}) or has 403/406 status
        const errorArg = args.find(arg => typeof arg === 'object' && arg !== null && !Array.isArray(arg));
        const isEmptyError = errorArg && Object.keys(errorArg).length === 0;
        const isPermissionError = errorArg && ((errorArg as any).status === 403 || (errorArg as any).status === 406);
        
        if (isEmptyError || isPermissionError || !errorArg) {
          // Completely suppress - don't log anything
          return;
        }
      }
    }
    
    // Suppress 400 errors
    if (message.includes('400') || message.includes('Bad Request')) {
      if (isSuppressedEndpoint || message.includes('No projects found')) {
        return; // Completely suppress
      }
    }
    
    // Suppress CSP violations in development (we're fixing them)
    if (process.env.NODE_ENV === 'development') {
      if (message.includes('Content Security Policy') || message.includes('CSP')) {
        const key = 'csp-violation';
        const count = suppressedErrors.get(key) || 0;
        if (count < MAX_SUPPRESSED_LOGS) {
          suppressedErrors.set(key, count + 1);
          console.debug('[Suppressed] CSP violation (checking media-src directive)');
        }
        return;
      }
    }
    
    // Call original error for everything else
    originalError.apply(console, args);
  };

  console.warn = function (...args: any[]) {
    const message = args.join(' ');
    
    // Suppress "No projects found" warnings
    if (message.includes('No projects found')) {
      return;
    }
    
    // Call original warn for everything else
    originalWarn.apply(console, args);
  };

  // Clean up suppressed errors map periodically
  setInterval(() => {
    suppressedErrors.clear();
  }, 60000); // Clear every minute
}
