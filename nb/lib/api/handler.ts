import { NextRequest, NextResponse } from "next/server";
import { AppError } from "./errors";
import { errorResponse } from "./response";
import { ZodError } from "zod";

type ApiHandler = (req: NextRequest, ...args: any[]) => Promise<NextResponse | Response>;

/**
 * Wrapper for API Route Handlers to centralize error handling
 */
export function createApiHandler(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      return await handler(req, ...args);
    } catch (err: unknown) {
      // 1. Handle Known AppErrors
      if (err instanceof AppError) {
        return errorResponse(err.message, err.statusCode, err.code);
      }

      // 2. Handle Zod Validation Errors (if strict mode throws them)
      if (err instanceof ZodError) {
        return errorResponse(
          "Validation Error", 
          400, 
          "VALIDATION_ERROR", 
          err.errors.map((e: { message: string }) => e.message)
        );
      }

      // 3. Handle Other Errors (Development vs Production)
      console.error("Unhandled API Error:", err);

      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const message = process.env.NODE_ENV === 'development' 
        ? errorMessage
        : "Something went wrong";
        
      const details = process.env.NODE_ENV === 'development' && err instanceof Error
        ? { stack: err.stack }
        : undefined;

      return errorResponse(message, 500, "INTERNAL_ERROR", details);
    }
  };
}
