/**
 * Standardized Supabase client creation for API routes
 */

import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export interface SupabaseClientOptions {
  useServiceRole?: boolean;
  response?: NextResponse;
}

/**
 * Create a standardized Supabase client for API routes
 * 
 * @param request - Next.js request object
 * @param options - Options for client creation
 * @returns Supabase client instance
 */
export function createApiSupabaseClient(
  request: NextRequest,
  options: SupabaseClientOptions = {}
): ReturnType<typeof createServerClient> {
  const { useServiceRole = false, response } = options;
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  // Use service role key if requested and available, otherwise use anon key
  const key = useServiceRole && supabaseServiceKey ? supabaseServiceKey : supabaseAnonKey;

  // For API routes, we need to handle cookies from the request
  // If response is provided, we can set cookies; otherwise, we can only read
  if (response) {
    return createServerClient(supabaseUrl, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
  }

  // If no response provided, use request cookies only (read-only)
  return createServerClient(supabaseUrl, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // No-op: can't set cookies without response
      },
    },
  });
}

/**
 * Create a Supabase client using cookies() from next/headers (for server components)
 * This is a separate function to avoid mixing patterns
 */
export async function createServerSupabaseClient(
  useServiceRole = false
): Promise<ReturnType<typeof createServerClient>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }

  const key = useServiceRole && supabaseServiceKey ? supabaseServiceKey : supabaseAnonKey;
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, key, {
    cookies: {
      async getAll() {
        return cookieStore.getAll();
      },
      async setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // No-op
        }
      },
    },
  });
}
