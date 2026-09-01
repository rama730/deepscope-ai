
/**
 * Strict presets to enforce efficient image sizing.
 * These map to specific use cases in the UI.
 */
export const IMAGE_PRESETS = {
  avatar: {
    xs: { width: 32, height: 32, quality: 75 },   // Navbar icons, comments
    sm: { width: 48, height: 48, quality: 80 },   // Lists, cards
    md: { width: 96, height: 96, quality: 85 },   // Profile headers
    lg: { width: 192, height: 192, quality: 90 }, // Profile pages
  },
  cover: {
    sm: { width: 320, height: 180, quality: 75 }, // Card thumbnails
    md: { width: 640, height: 360, quality: 80 }, // Blog/Project lists
    lg: { width: 1280, height: 720, quality: 85 }, // Hero sections
  }
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESETS;

/**
 * Generates an optimized Supabase Storage URL with transformation parameters.
 * 
 * @param url The original Supabase storage URL
 * @param width Target width
 * @param height Target height (optional, will preserve aspect ratio if omitted)
 * @param quality Quality (1-100, default 80)
 * @param format Format to convert to (default 'origin', can use 'webp' etc strictly via loader)
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  width: number,
  height?: number,
  quality: number = 80
): string {
  if (!url) return ''; // or return a placeholder path
  
  // Return internal/static paths as-is
  if (url.startsWith('/')) return url;
  if (!url.includes('supabase.co/storage/v1/object/public')) return url;

  // Supabase Transformation URL construction
  // Depending on whether using the 'render' or 'transform' endpoint.
  // Standard Supabase PRO/Enterprise transformation is usually via `/render/image/...` 
  // OR query params on the storage object URL if using the newer Resizing API.
  // Assuming standard Storage Image Resizing usage: 
  // https://supabase.com/docs/guides/storage/image-transformations
  
  // Note: The free tier of Supabase has limits on transformations. 
  // Ensuring we request standard sizes helps caching.
  
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('width', width.toString());
    if (height) urlObj.searchParams.set('height', height.toString());
    urlObj.searchParams.set('quality', quality.toString());
    urlObj.searchParams.set('format', 'origin'); // Respects 'Accept' header usually, or force 'webp'
    return urlObj.toString();
  } catch (e) {
    return url;
  }
}

/**
 * Helper to get a preset URL effortlessly.
 */
export function getPresetUrl(url: string | null | undefined, type: 'avatar' | 'cover', size: 'xs' | 'sm' | 'md' | 'lg') {
  // @ts-ignore - straightforward dynamic access
  const preset = IMAGE_PRESETS[type][size];
  if (!preset) return url || '';
  return getOptimizedImageUrl(url, preset.width, preset.height, preset.quality);
}
