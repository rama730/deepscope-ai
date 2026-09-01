/**
 * OAuth security utilities - Browser Compatible
 */

/**
 * Generate OAuth state parameter for CSRF protection
 */
export function generateOAuthState(): string {
  if (typeof window === "undefined") return "";
  
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Store OAuth state in session/cookie
 */
export function storeOAuthState(state: string): void {
  if (typeof window !== "undefined") {
    // Store in sessionStorage (cleared when tab closes)
    sessionStorage.setItem("oauth_state", state);
  }
}

/**
 * Get and validate OAuth state
 */
export function validateOAuthState(receivedState: string | null): boolean {
  if (!receivedState) return false;
  
  if (typeof window !== "undefined") {
    const storedState = sessionStorage.getItem("oauth_state");
    if (!storedState) return false;
    
    // Remove state after validation
    sessionStorage.removeItem("oauth_state");
    
    return receivedState === storedState;
  }
  
  return false;
}

/**
 * Generate PKCE code verifier and challenge
 */
export async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  if (typeof window === "undefined") {
    return { codeVerifier: "", codeChallenge: "" };
  }

  // Generate random verifier
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  const codeVerifier = base64UrlEncode(array);
  
  // Generate code challenge (SHA256 hash of verifier)
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const codeChallenge = base64UrlEncode(new Uint8Array(hashBuffer));
  
  return { codeVerifier, codeChallenge };
}

function base64UrlEncode(array: Uint8Array): string {
  let str = "";
  for (let i = 0; i < array.length; i++) {
    str += String.fromCharCode(array[i]);
  }
  const base64 = btoa(str);
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Store PKCE verifier
 */
export function storePKCEVerifier(codeVerifier: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("pkce_verifier", codeVerifier);
  }
}

/**
 * Get PKCE verifier
 */
export function getPKCEVerifier(): string | null {
  if (typeof window !== "undefined") {
    const verifier = sessionStorage.getItem("pkce_verifier");
    if (verifier) {
      sessionStorage.removeItem("pkce_verifier");
      return verifier;
    }
  }
  return null;
}
