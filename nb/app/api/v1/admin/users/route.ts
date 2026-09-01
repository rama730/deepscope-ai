import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { requireRole } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";

export const dynamic = 'force-dynamic';

async function listUsers(request: NextRequest) {
    const auth = await requireRole(['admin']);
    if (auth.error) return auth.error;

    const supabase = createSupabaseServerClient();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const { data: users, error, count } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_active, created_at, avatar_url', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });

    if (error) {
        return errorResponse("Failed to fetch users", 500, error.message);
    }

    return successResponse({
        users,
        pagination: {
            page,
            limit,
            total: count,
            totalPages: count ? Math.ceil(count / limit) : 0
        }
    });
}

export const GET = createApiHandler(listUsers);
