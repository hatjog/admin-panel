import Medusa from "@medusajs/js-sdk";

export const backendUrl = __BACKEND_URL__ ?? "/";

/**
 * Decode the JWT payload segment.
 *
 * cc-4 finding F-17: JWT base64url uses `-` `_` and may omit padding.
 * `atob` requires standard base64 — URL-safe payloads throw, the catch
 * returns null, isTokenExpired() treats null as expired, and the user is
 * logged out on every refresh. Normalise to standard base64 + pad before
 * calling atob.
 */
const decodeJwt = (token: string) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padLen = (4 - (b64.length % 4)) % 4;
    const padded = b64 + "=".repeat(padLen);
    const decoded = JSON.parse(atob(padded));

    return decoded;
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string | null) => {
  if (!token) {
    return true;
  }

  const payload = decodeJwt(token);

  if (!payload?.exp) {
    return true;
  }

  return payload.exp * 1000 < Date.now();
};

export const getAuthToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("medusa_auth_token");
};

export const sdk = new Medusa({
  baseUrl: backendUrl,
});

// useful when you want to call the BE from the console and try things out quickly
// cc-4 finding F-09: gate this on non-production so the convenience handle
// does not leak the SDK (and its in-flight auth token) into prod XSS surfaces.
if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as any).__sdk = sdk;
}
