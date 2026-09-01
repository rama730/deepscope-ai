import { createSupabaseServerClient } from '@/lib/supabase/server';
import { successResponse, errorResponse } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

/**
 * @route GET /api/v1/health
 * @description Health check endpoint to verify database connectivity
 * @requiresAuth false
 * @returns {Object} Health status
 */

export async function GET() {
  try {
    const supabase = createSupabaseServerClient();
    
    // Perform a lightweight query to check connection
    const { error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Health check failed:', error);
      return errorResponse('Database connection failed', 503, 'DB_ERROR');
    }

    return successResponse({ 
      database: 'connected',
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('Health check exception:', err);
    return errorResponse('Internal server error', 500, 'INTERNAL_ERROR');
  }
}
