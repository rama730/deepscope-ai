'use client';

import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import type { SupabaseClient } from '@supabase/supabase-js';

// Singleton instance for browser client
let browserClient: SupabaseClient | null = null;

/**
 * Creates or returns the singleton Supabase browser client.
 * This ensures only one client instance is created per browser session,
 * improving performance and reducing connection overhead.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
	if (browserClient) {
		return browserClient;
	}

	const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

	browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
		cookieOptions: {
			sameSite: 'lax',
			secure: process.env.NODE_ENV === 'production',
		},
	});
	return browserClient;
}

/**
 * Get the singleton client without creating a new one.
 * Returns null if the client hasn't been initialized yet.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
	return browserClient;
}

/**
 * Reset the singleton client (useful for testing or auth changes).
 * The next call to createSupabaseBrowserClient will create a fresh instance.
 */
export function resetSupabaseBrowserClient(): void {
	browserClient = null;
}
