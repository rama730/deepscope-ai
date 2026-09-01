/**
 * Utility functions for generating project slugs and display IDs
 */

/**
 * Common words to skip when generating acronyms
 */
const COMMON_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'for', 'of', 'to', 'in', 'on', 'at', 'by', 'with',
  'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can',
  'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'there', 'then'
]);

/**
 * Generate a URL-friendly slug from project title
 * Example: "UniCamp – Social Collaboration Hub" → "unicamp-social-collaboration-hub"
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    // Replace special characters and multiple spaces/hyphens with single hyphen
    .replace(/[^\w\s-]/g, '') // Remove special chars except word chars, spaces, hyphens
    .replace(/[\s_-]+/g, '-') // Replace spaces, underscores, multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .slice(0, 100); // Limit length
}

/**
 * Generate a unique slug by appending a number if the slug already exists
 * @param baseSlug - The base slug to check
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique slug (e.g., "unicamp", "unicamp-2", "unicamp-3")
 */
export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }
  
  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;
  
  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  return uniqueSlug;
}

/**
 * Extract first letters from words to create an acronym
 * Filters out common words and focuses on meaningful terms
 */
function extractAcronym(words: string[], maxLength: number = 10): string {
  const acronym: string[] = [];
  let lettersCollected = 0;

  for (const word of words) {
    if (lettersCollected >= maxLength) break;
    
    const cleaned = word.trim().toLowerCase();
    if (!cleaned) continue;
    
    // Skip common words
    if (COMMON_WORDS.has(cleaned)) continue;
    
    // Check if word is already an acronym (all caps and ≤3 chars, or common acronyms)
    const upperCleaned = cleaned.toUpperCase();
    const isAcronym = (cleaned.length <= 3 && cleaned === upperCleaned) || 
                      ['api', 'ui', 'ux', 'crm', 'saas', 'paas', 'iaas', 'ml', 'ai', 'vr', 'ar'].includes(cleaned);
    
    if (isAcronym) {
      // It's likely an acronym, include whole word if within limit
      if (lettersCollected + cleaned.length <= maxLength) {
        acronym.push(upperCleaned);
        lettersCollected += cleaned.length;
      } else {
        // Take first letter only if over limit
        acronym.push(upperCleaned[0]);
        lettersCollected++;
      }
    } else {
      // Regular word - take first letter
      acronym.push(upperCleaned[0]);
      lettersCollected++;
    }
  }

  return acronym.join('');
}

/**
 * Generate a smart acronym from project title
 * Example: "UniCamp Social Collaboration Hub" → "SCH"
 * Example: "Task Management System" → "TMS"
 * Example: "UniCamp" → "UNIC"
 */
function generateAcronymFromTitle(title: string, maxLength: number = 10): string {
  if (!title || !title.trim()) {
    return 'PRJ';
  }

  // Split by spaces, hyphens, and special characters
  const words = title
    .trim()
    .split(/[\s\-–—]+/)
    .filter(word => word.length > 0);

  if (words.length === 0) {
    return 'PRJ';
  }

  // Single word case
  if (words.length === 1) {
    const word = words[0].trim();
    if (word.length <= 3) {
      // Short word - use full word
      return word.toUpperCase();
    } else {
      // Long word - take first 4 letters
      return word.substring(0, 4).toUpperCase();
    }
  }

  // Multiple words - generate acronym
  // Strategy: Prefer descriptive words, can skip first word if it's a brand name
  let wordsToUse = words;
  
  // If we have 3+ words and first word is short (≤6 chars), skip it and focus on descriptive words
  // This handles cases like "UniCamp Social Collaboration Hub" → "SCH" (skip "UniCamp")
  if (words.length >= 3) {
    const firstWord = words[0].trim().toLowerCase();
    // Skip first word if it's short and looks like a brand name
    if (firstWord.length <= 6 && !COMMON_WORDS.has(firstWord)) {
      wordsToUse = words.slice(1); // Skip first word
    }
  }
  
  const acronym = extractAcronym(wordsToUse, maxLength);

  // Ensure minimum 3 letters - if too short, include first word's letters
  if (acronym.length < 3 && words.length > 0) {
    const firstWord = words[0].trim().toLowerCase();
    if (firstWord.length >= 2 && !COMMON_WORDS.has(firstWord)) {
      // Add first 2-3 letters from first word
      const prefix = firstWord.substring(0, Math.min(3, firstWord.length)).toUpperCase();
      const combined = (prefix + acronym).substring(0, maxLength);
      return combined.length >= 3 ? combined : acronym || 'PRJ';
    }
  }

  // If still too short, use first letters of first few words
  if (acronym.length < 3) {
    const fallback = words.slice(0, 3)
      .map(w => w.trim()[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .substring(0, maxLength);
    return fallback || 'PRJ';
  }

  return acronym || 'PRJ';
}

/**
 * Generate project display ID in format: PRJ-{ACRONYM}
 * Example: "UniCamp Social Collaboration Hub" → "PRJ-SCH"
 * Example: "Task Management System" → "PRJ-TMS"
 * Example: "UniCamp" → "PRJ-UNIC"
 * 
 * @param title - Project title
 * @returns Formatted project ID like "PRJ-SCH"
 */
export function generateProjectId(title: string): string {
  const acronym = generateAcronymFromTitle(title, 10);
  return `PRJ-${acronym}`;
}

/**
 * Generate a unique project ID by appending a number if it already exists
 * @param baseProjectId - The base project ID (e.g., "PRJ-SCH")
 * @param existingProjectIds - Array of existing project IDs to check against
 * @returns A unique project ID (e.g., "PRJ-SCH", "PRJ-SCH-1", "PRJ-SCH-2")
 */
export function generateUniqueProjectId(
  baseProjectId: string,
  existingProjectIds: string[]
): string {
  if (!existingProjectIds.includes(baseProjectId)) {
    return baseProjectId;
  }

  let counter = 1;
  let uniqueId = `${baseProjectId}-${counter}`;

  while (existingProjectIds.includes(uniqueId)) {
    counter++;
    uniqueId = `${baseProjectId}-${counter}`;
  }

  return uniqueId;
}

/**
 * Format project ID for display
 * This is mainly for consistency, but could add styling in the future
 */
export function formatProjectId(projectId: string): string {
  return projectId;
}
