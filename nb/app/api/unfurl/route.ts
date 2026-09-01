import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { logger } from '@/lib/logger';
import { successResponse, errorResponse, validationErrorResponse } from '@/lib/api/response';
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from '@/lib/api/rate-limit';
import { validateUrl } from '@/lib/api/ssrf-protection';
import { getCacheHeaders } from "@/lib/utils/cache-headers";

interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

/**
 * @route GET /api/unfurl
 * @description API endpoint to unfurl URLs and extract Open Graph metadata
 * @requiresAuth false
 * @rateLimitCategory unfurl
 * @queryParams url
 * @returns {Object} Open Graph data (title, description, image, etc.)
 * @throws {400} Missing or invalid URL
 * @throws {429} Rate limit exceeded
 * @throws {500} Server error
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get('url');

  if (!url) {
    return validationErrorResponse('URL is required');
  }

  try {
    // Validate URL format
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid || !urlValidation.url) {
      return validationErrorResponse(urlValidation.error || 'Invalid or unsafe URL');
    }

    // Rate limiting (by IP since this is a public endpoint)
    const { identifier, type } = getRateLimitIdentifier(request);
    const rateLimitResult = await checkRateLimit(
      request,
      identifier,
      type,
      'unfurl',
      RATE_LIMITS.UNFURL
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.message || "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED" },
        { 
          status: 429,
          headers: rateLimitResult.lockedUntil ? {
            "Retry-After": Math.ceil((new Date(rateLimitResult.lockedUntil).getTime() - Date.now()) / 1000).toString()
          } : {}
        }
      );
    }

    const response = new NextResponse();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: Record<string, unknown>) {
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    // Check if we already have a cached preview
    const { data: cached } = await supabase
      .from('link_previews')
      .select('*')
      .eq('url', urlValidation.url)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (cached) {
      return successResponse(cached, 200, undefined, getCacheHeaders("PUBLIC_STATIC"));
    }

    // Fetch the URL and parse Open Graph tags
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const fetchResponse = await fetch(urlValidation.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NB-Bot/1.0; +https://yourdomain.com/bot)',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!fetchResponse.ok) {
        throw new Error(`HTTP ${fetchResponse.status}`);
      }

      const html = await fetchResponse.text();
      const ogData = parseOpenGraph(html);

      // Get favicon
      const faviconUrl = getFaviconUrl(urlValidation.url, html);

      // Save to database
      const previewData = {
        url: urlValidation.url,
        title: (ogData.title || urlValidation.url).substring(0, 500),
        description: ogData.description?.substring(0, 1000) || null,
        image_url: ogData.image?.substring(0, 500) || null,
        site_name: ogData.siteName?.substring(0, 200) || null,
        favicon_url: faviconUrl.substring(0, 500),
      };

      const { data: preview, error } = await supabase
        .from('link_previews')
        .insert(previewData)
        .select()
        .single();

      if (error) {
        logger.error('Error saving link preview', { error: error.message });
        return successResponse(ogData, 200, undefined, getCacheHeaders("PUBLIC_STATIC")); // Return data even if caching fails
      }

      return successResponse(preview, 200, undefined, getCacheHeaders("PUBLIC_STATIC"));
    } catch (fetchError) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Failed to fetch URL';
      logger.error('Error fetching URL', { error: errorMessage, url: urlValidation.url });
      return errorResponse('Failed to fetch link preview', 500);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logger.error('Unfurl API error', { error: errorMessage });
    return errorResponse('Internal server error', 500);
  }
}

function parseOpenGraph(html: string): OpenGraphData {
  const data: OpenGraphData = {};

  // Extract og:title
  const titleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
  if (titleMatch) data.title = titleMatch[1];

  // Extract og:description
  const descMatch = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
  if (descMatch) data.description = descMatch[1];

  // Extract og:image
  const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i);
  if (imageMatch) data.image = imageMatch[1];

  // Extract og:site_name
  const siteMatch = html.match(/<meta\s+property="og:site_name"\s+content="([^"]*)"/i);
  if (siteMatch) data.siteName = siteMatch[1];

  // Fallback to <title> tag
  if (!data.title) {
    const titleTagMatch = html.match(/<title>([^<]*)<\/title>/i);
    if (titleTagMatch) data.title = titleTagMatch[1];
  }

  // Fallback to meta description
  if (!data.description) {
    const metaDescMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
    if (metaDescMatch) data.description = metaDescMatch[1];
  }

  return data;
}

function getFaviconUrl(pageUrl: string, html: string): string {
  // Try to find favicon in HTML
  const faviconMatch = html.match(/<link\s+[^>]*rel="(?:shortcut )?icon"[^>]*href="([^"]*)"/i);
  if (faviconMatch && faviconMatch[1]) {
    const href = faviconMatch[1];
    // Make absolute URL if relative
    if (href.startsWith('http')) {
      return href;
    }
    const urlObj = new URL(pageUrl);
    if (href.startsWith('//')) {
      return `${urlObj.protocol}${href}`;
    }
    if (href.startsWith('/')) {
      return `${urlObj.origin}${href}`;
    }
    return `${urlObj.origin}/${href}`;
  }

  // Default to /favicon.ico
  const urlObj = new URL(pageUrl);
  return `${urlObj.origin}/favicon.ico`;
}
