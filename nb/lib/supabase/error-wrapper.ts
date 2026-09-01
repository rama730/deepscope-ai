/**
 * Wrapper for Supabase queries to handle errors gracefully
 * Reduces console noise by suppressing expected errors
 */

import { logError, logSuppressedError } from '@/lib/error-handler';

/**
 * Wrap a Supabase query to handle errors gracefully
 */
export async function handleSupabaseQuery<T>(
  query: Promise<{ data: T | null; error: any }>,
  context?: string
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await query;
    
    if (result.error) {
      const url = result.error?.message || '';
      logSuppressedError(result.error, context, url);
      logError(result.error, context, url);
    }
    
    return result;
  } catch (error) {
    logError(error, context);
    return { data: null, error };
  }
}

/**
 * Wrap a Supabase query and return only data (throws on error)
 */
export async function handleSupabaseQueryOrThrow<T>(
  query: Promise<{ data: T | null; error: any }>,
  context?: string
): Promise<T> {
  const result = await handleSupabaseQuery(query, context);
  
  if (result.error) {
    throw result.error;
  }
  
  if (!result.data) {
    throw new Error('No data returned from query');
  }
  
  return result.data;
}

