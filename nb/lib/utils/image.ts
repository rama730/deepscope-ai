
/**
 * Generates an optimized URL for a Supabase Storage image using the Image Transformation API.
 * 
 * @param url - The original file URL (public URL)
 * @param width - The desired width (max)
 * @param quality - The desired quality (0-100), default 80
 * @returns The optimized URL with transformation parameters
 */
export function getOptimizedImageUrl(url: string, width: number, quality: number = 80): string {
  if (!url) return '';
  
  // Check if it's a Supabase Storage URL
  // Matches: https://<project>.supabase.co/storage/v1/object/public/...
  if (url.includes('supabase.co/storage/v1/object/public')) {
    // Append transformation parameters
    // We use '?' or '&' depending on existing params
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&quality=${quality}`;
  }
  
  return url;
}
