import { NextRequest, NextResponse } from "next/server";
import { fetchLinkPreview, cacheLinkPreview, getCachedLinkPreview } from "@/lib/services/linkPreview";
import { getCacheHeaders } from "@/lib/utils/cache-headers";

/**
 * @route GET /api/link-preview
 * @description Get link preview metadata
 * @requiresAuth false
 * @queryParams url - URL to preview
 * @returns {Object} Link preview data
 */

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");

    if (!url) {
        return NextResponse.json(
            { error: "URL parameter is required" },
            { status: 400 }
        );
    }

    try {
        // Validate URL
        new URL(url);

        // Check cache first
        const cached = await getCachedLinkPreview(url);
        if (cached) {
            return NextResponse.json(cached, {
                headers: getCacheHeaders("PUBLIC_STATIC"),
            });
        }

        // Fetch fresh preview
        const preview = await fetchLinkPreview(url);
        
        if (!preview) {
            return NextResponse.json(
                { error: "Could not fetch link preview" },
                { status: 404 }
            );
        }

        // Cache for future use
        await cacheLinkPreview(preview);

        return NextResponse.json(preview, {
            headers: getCacheHeaders("PUBLIC_STATIC"),
        });
    } catch (error) {
        console.error("Error in link preview API:", error);
        return NextResponse.json(
            { error: "Failed to fetch link preview" },
            { status: 500 }
        );
    }
}
