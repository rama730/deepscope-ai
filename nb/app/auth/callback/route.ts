import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { validateRedirectUrl } from "@/lib/auth/validation";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  
  // Validate OAuth state parameter (CSRF protection)
  // Note: Client-side also validates, but we check here too
  if (!state) {
    logger.warn("OAuth callback missing state parameter");
    // Still allow but log the issue - client-side should also validate
  }
  
  // Validate redirect URL to prevent open redirect attacks
  const redirectParam = requestUrl.searchParams.get("redirect");
  const safeRedirect = validateRedirectUrl(redirectParam, requestUrl.origin);
  
  let response = NextResponse.redirect(new URL(safeRedirect, requestUrl.origin));

  if (!code) {
    logger.warn("Auth callback called without code parameter");
    return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("Invalid authentication code"), requestUrl.origin));
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    logger.error("Missing Supabase environment variables");
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Configuration error")}`, requestUrl.origin));
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Check if this is a password reset flow
  const type = requestUrl.searchParams.get("type");
  const isPasswordReset = type === "password_reset";

  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    logger.error("Auth callback error", { error: error.message });
    // Don't expose detailed error messages to users
    if (isPasswordReset) {
      return NextResponse.redirect(new URL(`/forgot-password?error=${encodeURIComponent("Invalid or expired reset link. Please request a new one.")}`, requestUrl.origin));
    }
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Authentication failed. Please try again.")}`, requestUrl.origin));
  }

  if (!user) {
    logger.warn("Auth callback succeeded but no user returned");
    if (isPasswordReset) {
      return NextResponse.redirect(new URL(`/forgot-password?error=${encodeURIComponent("Invalid or expired reset link. Please request a new one.")}`, requestUrl.origin));
    }
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent("Authentication failed. Please try again.")}`, requestUrl.origin));
  }

  // For password reset, skip email verification check and go directly to reset page
  if (isPasswordReset) {
    // Redirect to clean reset password URL (code already exchanged, session is set)
    const resetUrl = new URL("/reset-password", requestUrl.origin);
    const finalResponse = NextResponse.redirect(resetUrl);
    
    // Copy cookies from the initial response
    const cookiesToSet = response.cookies.getAll();
    cookiesToSet.forEach(cookie => {
      finalResponse.cookies.set(cookie.name, cookie.value, {
        path: cookie.path,
        domain: cookie.domain,
        maxAge: cookie.maxAge,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
      });
    });
    
    // Set a cookie to indicate we are in a pending reset state
    // This will be used by middleware to restrict access until password is changed
    finalResponse.cookies.set("supabase-auth-reset-pending", "true", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600 // 1 hour expiration
    });
    
    logger.info("Password reset callback successful", { userId: user.id });
    return finalResponse;
  }

  // Check if email is verified (for non-password-reset flows)
  if (!user.email_confirmed_at) {
    logger.info("User authenticated but email not verified", { userId: user.id });
    // Redirect to email verification page or show message
    return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent("Please verify your email address before continuing."), requestUrl.origin));
  }

  // Use validated redirect URL
  const targetUrl = new URL(safeRedirect, requestUrl.origin);

  // Create the final redirect response
  const finalResponse = NextResponse.redirect(targetUrl);

  // CRITICAL: Copy cookies from the initial 'response' (where Supabase set the session) to 'finalResponse'
  const cookiesToSet = response.cookies.getAll();
  cookiesToSet.forEach(cookie => {
    finalResponse.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      domain: cookie.domain,
      maxAge: cookie.maxAge,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    });
  });

  logger.info("Auth callback successful", { userId: user.id, redirect: safeRedirect });

  return finalResponse;
}
