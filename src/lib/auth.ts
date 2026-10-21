import { cookies } from "next/headers";

/**
 * Session helpers shared by middleware (edge) and API routes.
 *
 * The session token is stateless and bound to a user id:
 *   `userId.expiresAtMs.hmacHex`
 * where the HMAC-SHA256 signature covers both the user id and the expiry.
 * Nothing sensitive is stored in the cookie; tampering is detected by
 * re-computing the signature.
 */

export const SESSION_COOKIE = "kodisalama_session";

export const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const REMEMBER_ME_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function getSessionSecret(): string {
  const value = process.env.APP_SESSION_SECRET;
  if (!value || value.length < 16) {
    throw new Error(
      "APP_SESSION_SECRET is missing or too short. Set it in your .env file (see .env.example)."
    );
  }
  return value;
}

/** Auth is ready when the signing secret is strong enough. */
export function authConfigured(): boolean {
  const secret = process.env.APP_SESSION_SECRET ?? "";
  return secret.length >= 16;
}

/** Constant-time string comparison (both digests are fixed-length hex). */
export function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacHex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Create a signed session token for `userId` valid for `ttlMs`. */
export async function createSessionToken(
  secret: string,
  userId: number,
  ttlMs: number = DEFAULT_SESSION_TTL_MS
): Promise<string> {
  const expiresAt = Date.now() + ttlMs;
  const payload = `${userId}.${expiresAt}`;
  const sig = await hmacHex(secret, payload);
  return `${payload}.${sig}`;
}

/** Verify a session token; returns the userId or null when invalid/expired. */
export async function verifySessionToken(
  token: string | undefined | null,
  secret: string
): Promise<number | null> {
  if (!token) return null;
  const first = token.indexOf(".");
  const second = first >= 0 ? token.indexOf(".", first + 1) : -1;
  if (first <= 0 || second <= first) return null;
  const userIdStr = token.slice(0, first);
  const expiresStr = token.slice(first + 1, second);
  const sig = token.slice(second + 1);
  const userId = Number(userIdStr);
  const expiresAt = Number(expiresStr);
  if (!Number.isInteger(userId) || userId < 1) return null;
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  const expected = await hmacHex(secret, `${userIdStr}.${expiresStr}`);
  if (!timingSafeEqualStr(sig, expected)) return null;
  return userId;
}

/** Cookie options for the session. `secure` should be true behind HTTPS. */
export function sessionCookieOptions(maxAgeSeconds: number, secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export async function readSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

/**
 * Resolve the signed-in user's id from the session cookie inside a route
 * handler or server component. Returns null when the visitor is not signed
 * in (API routes should respond 401; defense in depth beyond middleware).
 */
export async function getSessionUserId(): Promise<number | null> {
  try {
    const token = await readSessionToken();
    if (!token) return null;
    return await verifySessionToken(token, process.env.APP_SESSION_SECRET ?? "");
  } catch {
    return null;
  }
}
