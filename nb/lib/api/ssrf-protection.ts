/**
 * SSRF (Server-Side Request Forgery) protection utilities
 * Prevents requests to internal/private IP addresses
 */

/**
 * Check if a URL is safe to fetch (not internal/private)
 */
export function isSafeUrl(url: string): { safe: boolean; reason?: string } {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Block localhost and local IPs
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname.startsWith('127.') ||
      hostname === '[::1]'
    ) {
      return { safe: false, reason: 'Localhost not allowed' };
    }

    // Block private IP ranges (RFC 1918)
    const privateIpPatterns = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
      /^192\.168\./,              // 192.168.0.0/16
      /^169\.254\./,              // Link-local
      /^fc00:/,                   // IPv6 private
      /^fe80:/,                   // IPv6 link-local
    ];

    for (const pattern of privateIpPatterns) {
      if (pattern.test(hostname)) {
        return { safe: false, reason: 'Private IP range not allowed' };
      }
    }

    // Block metadata services (AWS, GCP, Azure)
    if (
      hostname.includes('metadata') ||
      hostname.includes('169.254.169.254') ||
      hostname === 'metadata.google.internal'
    ) {
      return { safe: false, reason: 'Metadata service not allowed' };
    }

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { safe: false, reason: 'Only HTTP and HTTPS protocols allowed' };
    }

    return { safe: true };
  } catch (error) {
    return { safe: false, reason: 'Invalid URL format' };
  }
}

/**
 * Validate and sanitize URL for safe fetching
 */
export function validateUrl(url: string | null | undefined): { valid: boolean; url?: string; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmed = url.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  // Check URL length (prevent extremely long URLs)
  if (trimmed.length > 2048) {
    return { valid: false, error: 'URL too long' };
  }

  // Check SSRF safety
  const safetyCheck = isSafeUrl(trimmed);
  if (!safetyCheck.safe) {
    return { valid: false, error: safetyCheck.reason || 'URL not allowed' };
  }

  return { valid: true, url: trimmed };
}
