/**
 * Comprehensive error handling system for improved user experience
 * Provides contextual, actionable error messages with proper categorization
 */

export interface ErrorDetails {
  title: string;
  message: string;
  action?: string;
  icon: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'permission' | 'validation' | 'rate_limit' | 'system' | 'user';
  retryable: boolean;
  helpUrl?: string;
}

export interface UserFriendlyError {
  id: string;
  details: ErrorDetails;
  originalError?: any;
  context?: Record<string, any>;
  timestamp: Date;
}

// Comprehensive error message catalog
export const ERROR_CATALOG: Record<string, ErrorDetails> = {
  // Network errors
  network_offline: {
    title: "You're offline",
    message: "Please check your internet connection and try again.",
    action: "Retry",
    icon: "wifi-off",
    severity: 'high',
    category: 'network',
    retryable: true
  },
  network_timeout: {
    title: "Request timed out",
    message: "The server is taking too long to respond. Please try again.",
    action: "Try again",
    icon: "clock",
    severity: 'medium',
    category: 'network',
    retryable: true
  },
  network_server_error: {
    title: "Server error",
    message: "Our servers are experiencing issues. We're working to fix this.",
    action: "Try again later",
    icon: "server",
    severity: 'high',
    category: 'network',
    retryable: true
  },
  network_connection_refused: {
    title: "Can't connect to the server",
    message: "We're having trouble reaching our servers. Please check your internet connection and try again.",
    action: "Retry connection",
    icon: "wifi-off",
    severity: 'high',
    category: 'network',
    retryable: true
  },

  // Permission errors
  permission_denied: {
    title: "Permission denied",
    message: "You don't have permission to perform this action.",
    action: "Contact admin",
    icon: "shield-x",
    severity: 'medium',
    category: 'permission',
    retryable: false,
    helpUrl: '/help/permissions'
  },
  permission_project_owner: {
    title: "Project owner only",
    message: "Only the project creator can perform this action.",
    action: "Contact project owner",
    icon: "crown",
    severity: 'medium',
    category: 'permission',
    retryable: false
  },
  permission_member_only: {
    title: "Members only",
    message: "You need to be a project member to access this feature.",
    action: "Join project",
    icon: "users",
    severity: 'medium',
    category: 'permission',
    retryable: false
  },

  // Validation errors
  validation_required_field: {
    title: "Required field missing",
    message: "Please fill in all required fields before continuing.",
    action: "Fix form",
    icon: "alert-circle",
    severity: 'low',
    category: 'validation',
    retryable: true
  },
  validation_invalid_email: {
    title: "Invalid email",
    message: "Please enter a valid email address.",
    action: "Fix email",
    icon: "mail-x",
    severity: 'low',
    category: 'validation',
    retryable: true
  },
  validation_password_weak: {
    title: "Password too weak",
    message: "Your password must be at least 8 characters with mixed case letters and numbers.",
    action: "Strengthen password",
    icon: "key",
    severity: 'medium',
    category: 'validation',
    retryable: true
  },
  validation_file_too_large: {
    title: "File too large",
    message: "Please select a file smaller than 10MB.",
    action: "Choose smaller file",
    icon: "file-x",
    severity: 'low',
    category: 'validation',
    retryable: true
  },

  // Rate limiting
  rate_limit_general: {
    title: "Too many requests",
    message: "You're doing that too often. Please wait a moment and try again.",
    action: "Wait and retry",
    icon: "timer",
    severity: 'medium',
    category: 'rate_limit',
    retryable: true
  },
  rate_limit_login: {
    title: "Too many login attempts",
    message: "Please wait 5 minutes before trying to log in again.",
    action: "Wait 5 minutes",
    icon: "shield-alert",
    severity: 'high',
    category: 'rate_limit',
    retryable: true
  },
  rate_limit_messages: {
    title: "Slow down",
    message: "You're sending messages too quickly. Please wait a moment.",
    action: "Wait before sending",
    icon: "message-circle-x",
    severity: 'low',
    category: 'rate_limit',
    retryable: true
  },

  // System errors
  system_database: {
    title: "Database error",
    message: "We're having trouble accessing your data. Please try again.",
    action: "Try again",
    icon: "database-x",
    severity: 'high',
    category: 'system',
    retryable: true
  },
  system_maintenance: {
    title: "Under maintenance",
    message: "We're currently updating the system. Please check back in a few minutes.",
    action: "Check back later",
    icon: "wrench",
    severity: 'high',
    category: 'system',
    retryable: true
  },
  system_unknown: {
    title: "Something went wrong",
    message: "An unexpected error occurred. Our team has been notified.",
    action: "Try again",
    icon: "alert-triangle",
    severity: 'medium',
    category: 'system',
    retryable: true
  },

  // User action errors
  user_already_exists: {
    title: "Account already exists",
    message: "An account with this email already exists. Try logging in instead.",
    action: "Go to login",
    icon: "user-check",
    severity: 'low',
    category: 'user',
    retryable: false
  },
  user_not_found: {
    title: "Account not found",
    message: "We couldn't find an account with that email address.",
    action: "Check email or sign up",
    icon: "user-x",
    severity: 'low',
    category: 'user',
    retryable: false
  },
  user_application_exists: {
    title: "Application already sent",
    message: "You've already applied to this project. Please wait for a response.",
    action: "View application",
    icon: "mail-check",
    severity: 'low',
    category: 'user',
    retryable: false
  },

  // Message-specific errors
  message_send_failed: {
    title: "Message not sent",
    message: "Your message couldn't be delivered. Please try sending it again.",
    action: "Retry sending",
    icon: "message-circle-x",
    severity: 'medium',
    category: 'system',
    retryable: true
  },
  message_too_long: {
    title: "Message too long",
    message: "Please keep your message under 2,000 characters.",
    action: "Shorten message",
    icon: "type",
    severity: 'low',
    category: 'validation',
    retryable: true
  },
  message_contains_spam: {
    title: "Message blocked",
    message: "Your message was blocked by our spam filter. Please rephrase and try again.",
    action: "Rephrase message",
    icon: "shield",
    severity: 'medium',
    category: 'validation',
    retryable: true
  }
};

// Error code mapping for common Supabase/PostgreSQL errors
export const ERROR_CODE_MAPPING: Record<string, string> = {
  // Supabase error codes
  'PGRST116': 'permission_denied',
  'PGRST301': 'permission_denied', 
  '23505': 'user_already_exists', // Unique constraint violation
  '23503': 'validation_required_field', // Foreign key constraint
  '42501': 'permission_denied', // Insufficient privilege
  'ENOTFOUND': 'network_offline',
  'ETIMEDOUT': 'network_timeout',
  'ECONNREFUSED': 'network_connection_refused',
  'ERR_CONNECTION_REFUSED': 'network_connection_refused',
  'ERR_NETWORK': 'network_connection_refused',
  
  // HTTP status codes
  '400': 'validation_required_field',
  '401': 'permission_denied',
  '403': 'permission_denied',
  '404': 'user_not_found',
  '409': 'user_already_exists',
  '422': 'validation_required_field',
  '429': 'rate_limit_general',
  '500': 'system_database',
  '502': 'network_server_error',
  '503': 'system_maintenance',
  '504': 'network_timeout'
};
