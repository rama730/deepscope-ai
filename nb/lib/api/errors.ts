/**
 * Custom Error Classes for centralized error handling
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(message: string, statusCode: number, code?: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation Error") {
    super(message, 400, "VALIDATION_ERROR");
  }
}

export class AuthError extends AppError {
  constructor(message = "Authentication Failed") {
    super(message, 401, "AUTH_ERROR");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access Forbidden") {
    super(message, 403, "FORBIDDEN_ERROR");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource Not Found") {
    super(message, 404, "NOT_FOUND_ERROR");
  }
}

export class ServerError extends AppError {
  constructor(message = "Internal Server Error") {
    super(message, 500, "SERVER_ERROR");
  }
}
