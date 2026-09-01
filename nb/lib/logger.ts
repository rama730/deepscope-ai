/**
 * Secure logging utility for production
 * Removes sensitive data and only logs in development
 */

import * as Sentry from "@sentry/nextjs";
import { env } from '@/lib/env';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = env.NEXT_PUBLIC_APP_ENV === 'development';
  private isProduction = env.NEXT_PUBLIC_APP_ENV === 'production';
  private isStaging = env.NEXT_PUBLIC_APP_ENV === 'staging';

  /**
   * Sanitize sensitive data from logs
   */
  private sanitize(data: unknown): unknown {
    if (!data || typeof data !== 'object') return data;

    // Preserve useful details from Error-like objects
    if (data instanceof Error) {
      return {
        name: data.name,
        message: data.message,
        stack: data.stack,
      };
    }

    const sensitiveKeys = [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'cookie',
      'session',
      'access_token',
      'refresh_token',
      'csrf',
      'api_key',
    ];

    // Some library errors (e.g., PostgREST) have non-enumerable properties.
    // Copy using getOwnPropertyNames so logs aren't just `{}`.
    const sanitized: any = Array.isArray(data) ? [...(data as any)] : {};
    if (!Array.isArray(data)) {
      for (const key of Object.getOwnPropertyNames(data)) {
        sanitized[key] = (data as any)[key];
      }
    }

    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitize(sanitized[key]);
      }
    }

    return sanitized;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (this.isProduction && level === 'debug') {
      return; // Never log debug in production
    }

    const sanitizedContext = context ? this.sanitize(context) : undefined;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const timestamp = new Date().toISOString();
    
    // In Development and Staging, use console
    if (!this.isProduction) {
      const consoleMethod = level === 'error' ? console.error : 
                           level === 'warn' ? console.warn : 
                           level === 'debug' ? console.debug : 
                           console.log;
      consoleMethod(`[${level.toUpperCase()}] ${message}`, sanitizedContext || '');
    } else {
      // In production, we're currently silent except for potential external services
      if (level === 'error') {
        Sentry.captureException(new Error(message), {
           extra: sanitizedContext
        });
      }
    }
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }
}

export const logger = new Logger();
