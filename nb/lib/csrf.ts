import { cookies } from "next/headers";
import crypto from "crypto";

const CSRF_TOKEN_COOKIE = "csrf-token";
const CSRF_TOKEN_COOKIE_HTTPONLY = "csrf-token-httponly"; // HttpOnly cookie for validation
const CSRF_TOKEN_HEADER = "x-csrf-token";

/**
 * Generate a CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Get or create CSRF token for the current session
 * Uses double-submit cookie pattern for enhanced security
 */
export async function getCSRFToken(): Promise<string> {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_TOKEN_COOKIE)?.value;
  let httpOnlyToken = cookieStore.get(CSRF_TOKEN_COOKIE_HTTPONLY)?.value;

  if (!token || !httpOnlyToken) {
    token = generateCSRFToken();
    httpOnlyToken = generateCSRFToken();
    
    const isProduction = process.env.NODE_ENV === "production";
    
    // Set both cookies - one accessible to JS (for double-submit), one httpOnly (for validation)
    cookieStore.set(CSRF_TOKEN_COOKIE, token, {
      httpOnly: false, // Must be accessible to JavaScript for double-submit pattern
      secure: isProduction, // Only secure in production
      sameSite: isProduction ? "strict" : "lax", // Strict in production, lax for localhost
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
    
    // HttpOnly cookie for server-side validation
    cookieStore.set(CSRF_TOKEN_COOKIE_HTTPONLY, httpOnlyToken, {
      httpOnly: true, // Not accessible to JavaScript
      secure: isProduction,
      sameSite: isProduction ? "strict" : "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });
  }

  return token;
}

/**
 * Verify CSRF token using double-submit cookie pattern
 */
export async function verifyCSRFToken(token: string | null | undefined): Promise<boolean> {
  if (!token) return false;

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_TOKEN_COOKIE)?.value;
  const httpOnlyToken = cookieStore.get(CSRF_TOKEN_COOKIE_HTTPONLY)?.value;

  // Both cookies must exist
  if (!cookieToken || !httpOnlyToken) return false;

  // Verify token matches the non-httpOnly cookie (double-submit pattern)
  if (token.length !== cookieToken.length) return false;

  // Use constant-time comparison to prevent timing attacks
  try {
    const tokensMatch = crypto.timingSafeEqual(
      Buffer.from(token, "utf8"),
      Buffer.from(cookieToken, "utf8")
    );
    
    // Also verify httpOnly token exists (additional security layer)
    return tokensMatch && httpOnlyToken.length > 0;
  } catch (error) {
    // If comparison fails (e.g., different lengths), return false
    return false;
  }
}

/**
 * Get CSRF token from request headers
 */
export function getCSRFTokenFromHeader(request: Request): string | null {
  return request.headers.get(CSRF_TOKEN_HEADER) || request.headers.get("x-csrf-token");
}

/**
 * Get CSRF token from form data
 */
export function getCSRFTokenFromForm(formData: FormData): string | null {
  return formData.get("csrf_token") as string | null;
}

export { CSRF_TOKEN_COOKIE, CSRF_TOKEN_HEADER };

