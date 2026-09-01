/**
 * Client-side helpers for consuming our standardized API responses.
 *
 * Server responses typically follow:
 * - Success: { success: true, data: T }
 * - Error:   { success: false, message: string, error?: { code?: string } }
 */
export type ApiOk<T> = { success: true; data?: T; [key: string]: unknown };
export type ApiErr = { success: false; message?: string; error?: { code?: string; [key: string]: unknown } };
export type ApiResponse<T> = ApiOk<T> | ApiErr | any;

export function getApiMessage(json: any, fallback: string) {
  return (
    (typeof json?.message === "string" && json.message) ||
    (typeof json?.error === "string" && json.error) ||
    fallback
  );
}

export function unwrapApiData<T>(json: ApiResponse<T>): { ok: true; data: T | undefined } | { ok: false; message: string; code?: string } {
  if (json?.success === true) {
    return { ok: true, data: json.data as T | undefined };
  }
  return {
    ok: false,
    message: getApiMessage(json, "Request failed"),
    code: typeof json?.error?.code === "string" ? json.error.code : undefined,
  };
}

export async function readJsonSafe(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}


