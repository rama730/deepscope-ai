import { z } from "zod";

/**
 * Common Validation Schemas
 * Reusable validation logic for standard data types
 */

// UUID Validation
export const uuidSchema = z.string().uuid("Invalid ID format");

// Pagination
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

// Search Params
export const searchParamsSchema = z.object({
  q: z.string().optional(),
  query: z.string().optional(),
  sort: z.enum(['newest', 'oldest', 'popular', 'updated']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

// Date Strings
export const dateStringSchema = z.string().datetime({ offset: true });

// Generic Metadata (for JSONB columns)
export const metadataSchema = z.record(z.string(), z.any()).default({});
