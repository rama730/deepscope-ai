import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { env } from "@/lib/env";

/**
 * Supabase server client factory
 * 
 * This module provides a centralized way to create Supabase clients for server-side operations.
 * It is intentionally designed as a high-impact shared utility to ensure:
 * - Consistent client configuration
 * - Proper cookie handling for SSR
 * - Single source of truth for client creation
 * 
 * This high coupling is intentional and beneficial for maintaining client consistency
 * and proper session management across the application.
 */
export function createSupabaseServerClient(request?: NextRequest, response?: NextResponse) {
	const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;


	// For API routes (with request/response)
	if (request) {
		const res = response || NextResponse.next();
		return createServerClient(supabaseUrl, supabaseAnonKey, {
			cookieOptions: {
				sameSite: 'lax',
				secure: process.env.NODE_ENV === 'production',
			},
			cookies: {
				getAll() {
					return request.cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
					cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
				},
			},
		});
	}

	// For Server Components (using cookies() from next/headers)
	return createServerClient(supabaseUrl, supabaseAnonKey, {
		cookieOptions: {
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
		},
		cookies: {
			async getAll() {
				const cookieStore = await cookies();
				return cookieStore.getAll();
			},
			async setAll(cookiesToSet) {
				try {
					const cookieStore = await cookies();
					cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
				} catch {
					// The `setAll` method was called from a Server Component.
					// This can be ignored if you have middleware refreshing
					// user sessions.
				}
			},
		},
	});
}
