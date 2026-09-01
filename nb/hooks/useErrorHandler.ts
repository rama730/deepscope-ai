/**
 * React hook for consistent error handling across the application
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { handleError, handleSupabaseError, handleValidationError } from '@/lib/errors/errorHandler';
import { UserFriendlyError } from '@/lib/errors/errorTypes';
import { logger } from '@/lib/logger';
import { useToast } from '@/components/ui-custom/Toast';

interface UseErrorHandlerOptions {
  showToast?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: UserFriendlyError) => void;
}

/**
 * Return type for error handler hook
 */
interface UseErrorHandlerReturn {
  error: UserFriendlyError | null;
  isRetrying: boolean;
  retryCount: number;
  handleError: (error: unknown, context?: Record<string, unknown>) => void;
  handleSupabaseError: (error: unknown, action?: string, resource?: string) => void;
  handleValidationError: (field: string, value: unknown, reason?: string) => void;
  retry: () => void;
  clearError: () => void;
  setRetryAction: (action: () => Promise<void> | void) => void;
}

/**
 * Hook for consistent error handling across the application
 * 
 * Provides centralized error handling with retry logic, toast notifications,
 * and user-friendly error messages. Supports auto-retry with exponential backoff.
 * 
 * @param options - Configuration options for error handling
 * @returns Object containing error state, handlers, and retry functions
 * @example
 * ```tsx
 * const { error, handleError, retry, clearError } = useErrorHandler({
 *   showToast: true,
 *   autoRetry: true,
 *   maxRetries: 3
 * });
 * ```
 */
export function useErrorHandler(options: UseErrorHandlerOptions = {}): UseErrorHandlerReturn {
  const {
    showToast = false,
    autoRetry = false,
    maxRetries = 3,
    retryDelay = 2000,
    onError
  } = options;
  
  // Get toast instance if available (optional, won't break if not in provider)
  let toast: { showToast: (message: string, type?: string) => void } | null = null;
  try {
    if (showToast && typeof window !== 'undefined') {
      const { useToast } = require('@/components/ui-custom/Toast');
      toast = useToast();
    }
  } catch {
    // Toast not available (not in provider), continue without it
    toast = null;
  }

  const [error, setError] = useState<UserFriendlyError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retryActionRef = useRef<(() => Promise<void> | void) | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const setRetryAction = useCallback((action: () => Promise<void> | void) => {
    retryActionRef.current = action;
  }, []);

  const retry = useCallback(async () => {
    if (!retryActionRef.current || isRetrying || retryCount >= maxRetries) {
      return;
    }

    setIsRetrying(true);
    try {
      await retryActionRef.current();
      clearError(); // Clear error on successful retry
    } catch (retryError) {
      setRetryCount(prev => prev + 1);
      // Don't update the error state here to avoid infinite loops
      logger.error('Retry failed', { retryCount, error: retryError instanceof Error ? retryError.message : String(retryError) });
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, retryCount, maxRetries, clearError]);

  // Auto-retry logic
  useEffect(() => {
    if (error && 
        error.details.retryable && 
        autoRetry && 
        retryCount < maxRetries && 
        retryActionRef.current &&
        !isRetrying) {
      
      const delay = retryDelay * Math.pow(2, retryCount); // Exponential backoff
      retryTimeoutRef.current = setTimeout(() => {
        retry();
      }, delay);
    }
  }, [error, autoRetry, retryCount, maxRetries, retryDelay, retry, isRetrying]);

  const handleErrorInternal = useCallback((
    rawError: unknown, 
    context?: Record<string, unknown>
  ) => {
    const userFriendlyError = handleError(rawError, context);
    setError(userFriendlyError);
    setRetryCount(0); // Reset retry count for new errors
    
    // Call custom error handler if provided
    if (onError) {
      onError(userFriendlyError);
    }

    // Show toast if enabled
    if (showToast && toast) {
      try {
        toast.showToast(userFriendlyError.details.title, 'error');
      } catch {
        // Toast failed, log instead
        logger.error('Error showing toast', { message: userFriendlyError.details.title });
      }
    }
  }, [onError, showToast, toast]);

  const handleSupabaseErrorInternal = useCallback((
    rawError: unknown,
    action?: string,
    resource?: string
  ) => {
    const userFriendlyError = handleSupabaseError(rawError, action, resource);
    setError(userFriendlyError);
    setRetryCount(0);
    
    if (onError) {
      onError(userFriendlyError);
    }

    if (showToast && toast) {
      try {
        toast.showToast(userFriendlyError.details.title, 'error');
      } catch {
        logger.error('Error showing toast', { message: userFriendlyError.details.title });
      }
    }
  }, [onError, showToast, toast]);

  const handleValidationErrorInternal = useCallback((
    field: string,
    value: unknown,
    reason?: string
  ) => {
    const userFriendlyError = handleValidationError(field, value, reason);
    setError(userFriendlyError);
    setRetryCount(0);
    
    if (onError) {
      onError(userFriendlyError);
    }

    if (showToast && toast) {
      try {
        toast.showToast(userFriendlyError.details.title, 'error');
      } catch {
        logger.error('Error showing toast', { message: userFriendlyError.details.title });
      }
    }
  }, [onError, showToast, toast]);

  return {
    error,
    isRetrying,
    retryCount,
    handleError: handleErrorInternal,
    handleSupabaseError: handleSupabaseErrorInternal,
    handleValidationError: handleValidationErrorInternal,
    retry,
    clearError,
    setRetryAction
  };
}

// Hook specifically for async operations with built-in error handling
/**
 * Options for async operation hook
 */
interface UseAsyncOperationOptions extends UseErrorHandlerOptions {
  onSuccess?: (result: unknown) => void;
}

/**
 * Hook for async operations with built-in error handling
 * 
 * Wraps async operations with error handling, loading states, and retry logic.
 * Automatically manages error state and provides retry functionality.
 * 
 * @param options - Configuration options extending error handler options
 * @returns Object containing error handler functions plus loading state and data
 * @example
 * ```tsx
 * const { loading, data, execute, error } = useAsyncOperation({
 *   onSuccess: (result) => console.log('Success:', result)
 * });
 * await execute(async () => await fetchData());
 * ```
 */
export function useAsyncOperation<T = unknown>(options: UseAsyncOperationOptions = {}) {
  const errorHandler = useErrorHandler(options);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ) => {
    setLoading(true);
    errorHandler.clearError();

    try {
      const result = await operation();
      setData(result);
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (error) {
      errorHandler.handleError(error, context);
      throw error; // Re-throw so caller can handle if needed
    } finally {
      setLoading(false);
    }
  }, [errorHandler, options]);

  // Set retry action to re-execute the last operation
  const lastOperationRef = useRef<{
    operation: () => Promise<T>;
    context?: Record<string, unknown>;
  } | null>(null);

  const executeWithRetry = useCallback(async (
    operation: () => Promise<T>,
    context?: Record<string, unknown>
  ) => {
    lastOperationRef.current = { operation, context };
    
    errorHandler.setRetryAction(async () => {
      if (lastOperationRef.current) {
        await execute(lastOperationRef.current.operation, lastOperationRef.current.context);
      }
    });

    return execute(operation, context);
  }, [execute, errorHandler]);

  return {
    ...errorHandler,
    loading,
    data,
    execute: executeWithRetry
  };
}

/**
 * Hook for form validation with error handling
 * 
 * Manages field-level validation errors with per-field error state.
 * Useful for complex forms with multiple validation rules.
 * 
 * @returns Object containing field errors, error checking functions, and setters
 * @example
 * ```tsx
 * const { fieldErrors, setFieldError, clearFieldError, hasErrors } = useFormErrorHandler();
 * setFieldError('email', validationError, 'Invalid email format');
 * ```
 */
export function useFormErrorHandler() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, UserFriendlyError>>({});

  const setFieldError = useCallback((field: string, error: unknown, reason?: string) => {
    const userFriendlyError = handleValidationError(field, null, reason);
    setFieldErrors(prev => ({
      ...prev,
      [field]: userFriendlyError
    }));
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      const { [field]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setFieldErrors({});
  }, []);

  const hasErrors = Object.keys(fieldErrors).length > 0;

  return {
    fieldErrors,
    hasErrors,
    setFieldError,
    clearFieldError,
    clearAllErrors
  };
}
