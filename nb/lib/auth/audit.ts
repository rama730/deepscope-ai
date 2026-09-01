/**
 * Security audit logging
 */

import { logger } from "@/lib/logger";

export type SecurityEventType =
  | "login_success"
  | "login_failure"
  | "logout"
  | "password_reset_requested"
  | "password_reset_completed"
  | "email_verification_sent"
  | "email_verified"
  | "suspicious_login"
  | "account_locked"
  | "session_revoked"
  | "csrf_token_invalid"
  | "rate_limit_exceeded"
  | "oauth_login"
  | "oauth_failure";

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Log security event
 */
export function logSecurityEvent(event: Omit<SecurityEvent, "timestamp">) {
  const securityEvent: SecurityEvent = {
    ...event,
    timestamp: new Date(),
  };

  // In production, you would send this to a security monitoring service
  // For now, we use the logger which handles sanitization
  logger.info("Security event", {
    type: securityEvent.type,
    userId: securityEvent.userId,
    ipAddress: securityEvent.ipAddress,
    metadata: securityEvent.metadata,
  });

  // In a real implementation, you might also:
  // 1. Store in database for audit trail
  // 2. Send to SIEM system
  // 3. Trigger alerts for critical events
  // 4. Update user security dashboard
}

/**
 * Log suspicious activity
 */
export function logSuspiciousActivity(
  userId: string | undefined,
  activity: string,
  details?: Record<string, any>
) {
  logSecurityEvent({
    type: "suspicious_login",
    userId,
    metadata: {
      activity,
      ...details,
    },
  });
}
