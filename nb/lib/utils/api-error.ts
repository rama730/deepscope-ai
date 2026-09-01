import { ZodError } from "zod";

/**
 * consistently parse error messages from various sources
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return "Unknown error occurred";

  if (typeof error === "string") return error;

  if (error instanceof ZodError) {
    const err = error as any;
    return err.errors?.[0]?.message || err.issues?.[0]?.message || "Validation failed";
  }

  if (error instanceof Error) {
    return error.message;
  }

  // Supabase error-like objects
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as any).message);
  }

  return "Something went wrong";
}
