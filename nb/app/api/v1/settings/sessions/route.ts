import { successResponse } from "@/lib/api/response";
import { requireAuth } from "@/lib/auth/guards";
import { createApiHandler } from "@/lib/api/handler";

export const dynamic = 'force-dynamic';

async function getSessions() {
    const auth = await requireAuth();
    if (auth.error) return auth.error;

    // Supabase Auth doesn't provide a list of active sessions via standard client yet.
    // We will return a mock list simulating the current session + historical ones if we were tracking them.
    // For this demo, we'll return the current session as "Active Now".
    
    // const { user } = auth;

    return successResponse({
        sessions: [
            {
                id: 'current-session',
                device: 'Current Device', // In real app, parse User-Agent
                location: 'Unknown Location', // In real app, use IP geolocation
                lastActive: new Date().toISOString(),
                isCurrent: true
            },
            // Mocking a past session
            {
                id: 'past-session-1',
                device: 'Chrome on Mac OS X',
                location: 'New York, USA',
                lastActive: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
                isCurrent: false
            }
        ]
    });
}

export const GET = createApiHandler(getSessions);
