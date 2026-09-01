"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSafeUrl } from "@/lib/api/ssrf-protection";

export interface LinkPreview {
    url: string;
    title?: string;
    description?: string;
    image?: string;
    siteName?: string;
    favicon?: string;
}

/**
 * Fetch link preview metadata from a URL.
 * This is a server-side function to avoid CORS issues.
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreview | null> {
    try {
        // Validate URL safety (SSRF Protection)
        const safety = isSafeUrl(url);
        if (!safety.safe) {
            console.warn(`Blocked unsafe URL: ${url} (${safety.reason})`);
            return null;
        }

        // Validate URL
        const urlObj = new URL(url);
        
        // Fetch the page
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0)',
            },
            signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (!response.ok) {
            return null;
        }

        const html = await response.text();
        
        // Parse Open Graph and Twitter Card meta tags
        const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                            html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i) ||
                            html.match(/<title>([^<]+)<\/title>/i);
        
        const descriptionMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i) ||
                                  html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i) ||
                                  html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
        
        const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                           html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
        
        const siteNameMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']+)["']/i);
        
        const faviconMatch = html.match(/<link\s+rel=["'](?:shortcut\s+)?icon["']\s+href=["']([^"']+)["']/i);

        return {
            url,
            title: titleMatch?.[1]?.trim() || undefined,
            description: descriptionMatch?.[1]?.trim().substring(0, 200) || undefined,
            image: imageMatch?.[1] ? new URL(imageMatch[1], url).toString() : undefined,
            siteName: siteNameMatch?.[1]?.trim() || urlObj.hostname,
            favicon: faviconMatch?.[1] ? new URL(faviconMatch[1], url).toString() : `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`,
        };
    } catch (error) {
        console.error("Error fetching link preview:", error);
        return null;
    }
}

/**
 * Cache link preview in database for faster subsequent loads.
 */
export async function cacheLinkPreview(preview: LinkPreview): Promise<void> {
    try {
        const supabase = await createSupabaseServerClient();
        await supabase
            .from('link_previews')
            .upsert({
                url: preview.url,
                title: preview.title ?? null,
                description: preview.description ?? null,
                image: preview.image ?? null,
                site_name: preview.siteName ?? null,
                favicon: preview.favicon ?? null,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'url'
            });
    } catch (error) {
        console.error("Error caching link preview:", error);
        // Non-critical, continue without caching
    }
}

/**
 * Get cached link preview from database.
 */
export async function getCachedLinkPreview(url: string): Promise<LinkPreview | null> {
    try {
        const supabase = await createSupabaseServerClient();
        const { data } = await supabase
            .from('link_previews')
            .select('*')
            .eq('url', url)
            .single();

        if (data) {
            return {
                url: data.url,
                title: data.title,
                description: data.description,
                image: data.image,
                siteName: data.site_name,
                favicon: data.favicon,
            };
        }
    } catch (error) {
        console.error("Error getting cached link preview:", error);
    }
    return null;
}
