import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
	let response = NextResponse.next({
		request: {
			headers: request.headers,
		},
	});

    // Adaptive Loading: Check for Save-Data or reduced data preference
	const saveData = request.headers.get("save-data");
	const reducedData = request.headers.get("sec-ch-ua-reduced-data");
	
	if (saveData === "on" || reducedData === "true") {
		response.headers.set("x-adaptive-loading", "true");
	}

	const pathname = request.nextUrl.pathname;

	// Early exit for static assets and public routes - skip auth check entirely
	const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback', '/api/v1/auth'];
	const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
	const isStaticAsset = pathname.startsWith('/_next') || pathname.includes('.') || pathname === '/favicon.ico';

	// Protected routes
	const protectedRoutes = ['/onboarding', '/explorer', '/hub', '/projects', '/profile', '/settings', '/messages', '/notifications', '/analytics', '/admin', '/people', '/api/v1'];
	const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

	// Skip auth check for public routes and static assets
	if (isPublicRoute || isStaticAsset) {
		// Still set basic security headers
		response.headers.set('X-Content-Type-Options', 'nosniff');
		response.headers.set('X-Frame-Options', 'DENY');
		response.headers.set('X-XSS-Protection', '1; mode=block');
		response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
		
		return response;
	}

	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	if (!supabaseUrl || !supabaseAnon) {
		return response;
	}

	const supabase = createServerClient(
		supabaseUrl,
		supabaseAnon,
		{
			cookieOptions: {
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
				partitioned: true,
			},
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

	// Only check auth for protected routes - this is the optimization
	let user = null;
	if (isProtectedRoute) {
		const { data: { user: authUser } } = await supabase.auth.getUser();
		user = authUser;
	}

	// Add security headers (applied to the current response object)
	const isLocalhost = request.nextUrl.hostname === 'localhost' || 
	                   request.nextUrl.hostname === '127.0.0.1' ||
	                   request.nextUrl.hostname.endsWith('.local');
	const isProduction = process.env.NODE_ENV === 'production';

	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-XSS-Protection', '1; mode=block');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	// Allow geolocation prompts (used by onboarding "Use detected").
	// Microphone/camera remain disabled by default.
	response.headers.set('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
	response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
	
	// Content Security Policy
	const csp = isLocalhost ? [
		"default-src 'self' http://localhost:* ws://localhost:* wss://localhost:*",
		"script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* https://www.google.com https://www.gstatic.com",
		"worker-src 'self' blob: http://localhost:*",
		"style-src 'self' 'unsafe-inline' http://localhost:* https://fonts.googleapis.com",
		"font-src 'self' http://localhost:* https://fonts.gstatic.com https://r2cdn.perplexity.ai data:",
		"img-src 'self' data: https: http: blob:",
		"media-src 'self' https: http: blob: data:",
		"connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* https://*.supabase.co wss://*.supabase.co",
		"frame-src 'self' http://localhost:* https://www.google.com",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'"
	].join('; ') : [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' https://www.google.com https://www.gstatic.com",
		"worker-src 'self' blob:",
		"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
		"font-src 'self' https://fonts.gstatic.com https://r2cdn.perplexity.ai data:",
		"img-src 'self' data: https: blob:",
		"media-src 'self' https: blob: data:",
		"connect-src 'self' https://*.supabase.co wss://*.supabase.co",
		"frame-src 'self' https://www.google.com",
		"object-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
		"upgrade-insecure-requests"
	].join('; ');
	response.headers.set('Content-Security-Policy', csp);

	if (isProduction && !isLocalhost && request.nextUrl.protocol === 'https:') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
	}

	if (!user && isProtectedRoute) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
        }
		const loginUrl = new URL('/login', request.url);
		loginUrl.searchParams.set('redirect', pathname);
		return NextResponse.redirect(loginUrl);
	}

	// Email verification check
	if (user && !user.email_confirmed_at && isProtectedRoute) {
		if (!pathname.startsWith('/settings')) {
			const verifyUrl = new URL('/settings/account', request.url);
			verifyUrl.searchParams.set('verify', 'email');
			return NextResponse.redirect(verifyUrl);
		}
	}

	// Redirect authenticated users away from auth pages
	if (user && (pathname === '/login' || pathname === '/signup')) {
		return NextResponse.redirect(new URL('/explorer', request.url));
	}
	return response;
}

export default proxy;

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};


