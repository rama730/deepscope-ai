/**
 * Central error handler that converts technical errors into user-friendly messages
 */

import { ERROR_CATALOG, ERROR_CODE_MAPPING, UserFriendlyError, ErrorDetails } from './errorTypes';

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: UserFriendlyError[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Convert any error into a user-friendly format
   */
  handleError(error: any, context?: Record<string, any>): UserFriendlyError {
    const errorId = this.generateErrorId();
    const userFriendlyError: UserFriendlyError = {
      id: errorId,
      details: this.mapErrorToDetails(error, context),
      originalError: error,
      context,
      timestamp: new Date()
    };

    // Log error for debugging (in production, this would go to monitoring service)
    this.logError(userFriendlyError);

    return userFriendlyError;
  }

  /**
   * Map technical error to user-friendly details
   */
  private mapErrorToDetails(error: any, context?: Record<string, any>): ErrorDetails {
    // Handle known error types first
    if (error?.code && ERROR_CODE_MAPPING[error.code]) {
      const catalogKey = ERROR_CODE_MAPPING[error.code];
      return this.enhanceErrorDetails(ERROR_CATALOG[catalogKey], error, context);
    }

    // Handle HTTP status codes
    if (error?.status && ERROR_CODE_MAPPING[error.status.toString()]) {
      const catalogKey = ERROR_CODE_MAPPING[error.status.toString()];
      return this.enhanceErrorDetails(ERROR_CATALOG[catalogKey], error, context);
    }

    // Handle Supabase specific errors
    if (error?.message) {
      return this.mapMessageToError(error.message, context);
    }

    // Handle network errors
    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      // Check for specific connection error messages
      const message = error?.message?.toLowerCase() || '';
      if (message.includes('failed to fetch') || 
          message.includes('network error') ||
          message.includes('connection refused') ||
          message.includes("can't connect")) {
        return ERROR_CATALOG.network_connection_refused;
      }
      return ERROR_CATALOG.network_offline;
    }

    // Handle connection refused errors specifically
    if (error?.code === 'ECONNREFUSED' || 
        error?.code === 'ERR_CONNECTION_REFUSED' ||
        error?.code === 'ERR_NETWORK') {
      return ERROR_CATALOG.network_connection_refused;
    }

    // Handle validation errors from forms
    if (context?.type === 'validation') {
      return this.getValidationError(context);
    }

    // Handle message-specific errors
    if (context?.action === 'send_message') {
      return ERROR_CATALOG.message_send_failed;
    }

    // Handle project permission errors
    if (context?.resource === 'project') {
      if (context?.requiredRole === 'owner') {
        return ERROR_CATALOG.permission_project_owner;
      }
      if (context?.requiredRole === 'member') {
        return ERROR_CATALOG.permission_member_only;
      }
    }

    // Default fallback
    return ERROR_CATALOG.system_unknown;
  }

  /**
   * Map error message content to appropriate error type
   */
  private mapMessageToError(message: string, context?: Record<string, any>): ErrorDetails {
    const lowerMessage = message.toLowerCase();

    // Network-related messages
    if (lowerMessage.includes('connection refused') || 
        lowerMessage.includes("can't connect") ||
        lowerMessage.includes('failed to connect')) {
      return ERROR_CATALOG.network_connection_refused;
    }
    if (lowerMessage.includes('network') || lowerMessage.includes('connection')) {
      return ERROR_CATALOG.network_offline;
    }

    // Permission-related messages
    if (lowerMessage.includes('permission') || lowerMessage.includes('unauthorized')) {
      return ERROR_CATALOG.permission_denied;
    }

    // Validation-related messages
    if (lowerMessage.includes('required') || lowerMessage.includes('missing')) {
      return ERROR_CATALOG.validation_required_field;
    }

    if (lowerMessage.includes('email') && lowerMessage.includes('invalid')) {
      return ERROR_CATALOG.validation_invalid_email;
    }

    // Rate limiting
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many')) {
      return ERROR_CATALOG.rate_limit_general;
    }

    // User account issues
    if (lowerMessage.includes('already exists') || lowerMessage.includes('duplicate')) {
      return ERROR_CATALOG.user_already_exists;
    }

    if (lowerMessage.includes('not found') || lowerMessage.includes('does not exist')) {
      return ERROR_CATALOG.user_not_found;
    }

    // Message-specific errors
    if (lowerMessage.includes('message') && lowerMessage.includes('failed')) {
      return ERROR_CATALOG.message_send_failed;
    }

    return ERROR_CATALOG.system_unknown;
  }

  /**
   * Get validation-specific error details
   */
  private getValidationError(context: Record<string, any>): ErrorDetails {
    if (context.field === 'email') {
      return ERROR_CATALOG.validation_invalid_email;
    }
    if (context.field === 'password') {
      return ERROR_CATALOG.validation_password_weak;
    }
    if (context.field === 'file' && context.reason === 'size') {
      return ERROR_CATALOG.validation_file_too_large;
    }
    
    return ERROR_CATALOG.validation_required_field;
  }

  /**
   * Enhance error details with context-specific information
   */
  private enhanceErrorDetails(baseDetails: ErrorDetails, error: any, context?: Record<string, any>): ErrorDetails {
    const enhanced = { ...baseDetails };

    // Add context-specific enhancements
    if (context?.entityName) {
      enhanced.message = enhanced.message.replace('this action', `this action on ${context.entityName}`);
    }

    if (context?.retryDelay) {
      enhanced.message = enhanced.message.replace('a moment', `${context.retryDelay} seconds`);
    }

    // Add specific help URLs based on context
    if (context?.helpSection) {
      enhanced.helpUrl = `/help/${context.helpSection}`;
    }

    return enhanced;
  }

  /**
   * Generate unique error ID for tracking
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log error for debugging and monitoring
   */
  private logError(error: UserFriendlyError): void {
    // Store in memory (in production, send to monitoring service)
    this.errorLog.push(error);
    
    // Keep only last 100 errors in memory
    if (this.errorLog.length > 100) {
      this.errorLog.shift();
    }

    // Console log for development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error ${error.id}`);
      console.log('User-friendly:', error.details);
      console.log('Original error:', error.originalError);
      console.log('Context:', error.context);
      console.groupEnd();
    }
  }

  /**
   * Get recent errors for debugging
   */
  getRecentErrors(): UserFriendlyError[] {
    return this.errorLog.slice(-10);
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }
}

// Convenience function for quick error handling
export function handleError(error: any, context?: Record<string, any>): UserFriendlyError {
  return ErrorHandler.getInstance().handleError(error, context);
}

// Specific helper functions for common scenarios
export function handleSupabaseError(error: any, action?: string, resource?: string): UserFriendlyError {
  return handleError(error, { action, resource, source: 'supabase' });
}

export function handleValidationError(field: string, value: any, reason?: string): UserFriendlyError {
  return handleError(
    { message: `Validation failed for ${field}` },
    { type: 'validation', field, value, reason }
  );
}

export function handleNetworkError(error: any, endpoint?: string): UserFriendlyError {
  return handleError(error, { type: 'network', endpoint });
}

export function handlePermissionError(requiredRole?: string, resource?: string): UserFriendlyError {
  return handleError(
    { message: 'Permission denied' },
    { type: 'permission', requiredRole, resource }
  );
}
