/**
 * Route metadata utilities for API endpoint discovery and documentation
 * 
 * This module provides utilities to define and export route metadata in a format
 * that can be easily discovered by code analysis tools and documentation generators.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface RouteMetadata {
  /** The full path of the route (e.g., '/api/v1/users/me') */
  path: string;
  /** HTTP methods supported by this route */
  methods: HttpMethod[];
  /** Brief description of what this route does */
  description?: string;
  /** Whether authentication is required */
  requiresAuth?: boolean;
  /** Required roles/permissions (if any) */
  requiredRoles?: string[];
  /** Rate limiting category (if applicable) */
  rateLimitCategory?: string;
  /** Query parameters (if any) */
  queryParams?: string[];
  /** Request body schema description */
  requestBody?: string;
  /** Response schema description */
  responseSchema?: string;
}

/**
 * Create route metadata object
 */
export function createRouteMetadata(metadata: RouteMetadata): RouteMetadata {
  return metadata;
}

/**
 * NOTE: ROUTE_METADATA should NOT be exported from Next.js route files
 * as Next.js has strict type constraints on route file exports.
 * 
 * Instead, use JSDoc comments with @route annotations, which tools can parse.
 * The metadata can be stored in the manifest file (app/api/_manifest.ts) for
 * programmatic access.
 * 
 * For documentation purposes only - do not export from route files.
 */
export function exportRouteMetadata(metadata: RouteMetadata): RouteMetadata {
  // This function is kept for type checking and documentation purposes
  // but ROUTE_METADATA should not be exported from route files
  return metadata;
}

/**
 * Helper to generate JSDoc comments for route handlers
 */
export function generateRouteJSDoc(metadata: RouteMetadata): string {
  const lines: string[] = [];
  
  // Add route annotations for each method
  metadata.methods.forEach(method => {
    let routeLine = ` * @route ${method} ${metadata.path}`;
    if (metadata.queryParams && metadata.queryParams.length > 0) {
      routeLine += `?${metadata.queryParams.map(p => `${p}=<${p}>`).join('&')}`;
    }
    lines.push(routeLine);
  });
  
  if (metadata.description) {
    lines.push(` * @description ${metadata.description}`);
  }
  
  if (metadata.requiresAuth) {
    lines.push(` * @requiresAuth true`);
  }
  
  if (metadata.requiredRoles && metadata.requiredRoles.length > 0) {
    lines.push(` * @requiredRoles ${metadata.requiredRoles.join(', ')}`);
  }
  
  if (metadata.queryParams && metadata.queryParams.length > 0) {
    lines.push(` * @queryParams ${metadata.queryParams.join(', ')}`);
  }
  
  if (metadata.requestBody) {
    lines.push(` * @requestBody ${metadata.requestBody}`);
  }
  
  if (metadata.responseSchema) {
    lines.push(` * @responseSchema ${metadata.responseSchema}`);
  }
  
  return `/**\n${lines.join('\n')}\n */`;
}
