/**
 * Message content sanitization and XSS protection
 */

/**
 * Sanitize message content to prevent XSS attacks
 */
export function sanitizeMessageContent(content: string): string {
  if (!content) return '';

  let sanitized = content;
  let previous = '';
  let iterations = 0;
  // Limit iterations to prevent potential ReDoS or infinite loops on complex nested inputs
  const maxIterations = 10;

  // Recursively remove dangerous patterns to prevent bypasses (e.g., <scr<script>ipt>)
  while (sanitized !== previous && iterations < maxIterations) {
    previous = sanitized;
    iterations++;

    // Remove potentially dangerous HTML tags (scripts, iframes, objects, etc.)
    // Matches <script ... > ... </script ... > including newlines and spaces
    sanitized = sanitized.replace(/<script\b[\s\S]*?>[\s\S]*?<\/script\s*>/gi, '');
    
    // Remove individual opening/closing script tags if they remain (malformed)
    sanitized = sanitized.replace(/<script\b[^>]*>/gi, '');
    sanitized = sanitized.replace(/<\/script\s*>/gi, '');

    // Remove event handlers (on* attributes)
    // Catches: onhover="...", onclick='...', onmouseover=...
    sanitized = sanitized.replace(/\s+on\w+\s*=\s*(?:["'][^"']*["']|[^>\s]+)/gi, '');

    // Remove dangerous protocols
    sanitized = sanitized.replace(/javascript\s*:/gi, '');
    sanitized = sanitized.replace(/vbscript\s*:/gi, '');
    sanitized = sanitized.replace(/data\s*:/gi, '');
  }

  // Escape HTML entities to neutralize any remaining markup
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return sanitized;
}

/**
 * Validate message content length and format
 */
export function validateMessageContent(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  // Maximum message length (10,000 characters)
  if (content.length > 10000) {
    return { valid: false, error: 'Message is too long. Maximum 10,000 characters allowed.' };
  }

  // Check for excessive whitespace (potential spam)
  const whitespaceRatio = (content.match(/\s/g) || []).length / content.length;
  if (whitespaceRatio > 0.8) {
    return { valid: false, error: 'Message contains too much whitespace' };
  }

  // Check for repeated characters (potential spam)
  const repeatedCharPattern = /(.)\1{20,}/;
  if (repeatedCharPattern.test(content)) {
    return { valid: false, error: 'Message contains too many repeated characters' };
  }

  return { valid: true };
}

/**
 * Check for spam patterns
 */
export function detectSpam(content: string): { isSpam: boolean; reason?: string } {
  // const lowerContent = content.toLowerCase(); // Unused

  // Common spam patterns
  const spamPatterns = [
    { pattern: /(click here|buy now|limited time|act now|urgent|free money)/i, reason: 'Contains spam keywords' },
    { pattern: /(http|https|www\.)\S+/gi, reason: 'Contains URLs (may be spam)' },
    { pattern: /\b\d{10,}\b/, reason: 'Contains long number sequences' },
    { pattern: /[A-Z]{20,}/, reason: 'Contains excessive uppercase letters' },
  ];

  for (const { pattern, reason } of spamPatterns) {
    if (pattern.test(content)) {
      return { isSpam: true, reason };
    }
  }

  return { isSpam: false };
}

/**
 * Clean and validate message content
 */
export function cleanMessageContent(content: string): { cleaned: string; valid: boolean; error?: string } {
  // First validate
  const validation = validateMessageContent(content);
  if (!validation.valid) {
    return { cleaned: '', valid: false, error: validation.error };
  }

  // Check for spam
  const spamCheck = detectSpam(content);
  if (spamCheck.isSpam) {
    return { cleaned: '', valid: false, error: spamCheck.reason || 'Message appears to be spam' };
  }

  // Sanitize
  const sanitized = sanitizeMessageContent(content);

  return { cleaned: sanitized, valid: true };
}
