import { cookies } from "next/headers";

/**
 * Session helpers shared by middleware (edge) and API routes.
 *
 * The session token is stateless: `expiresAtMs.hmacHex` where the HMAC-SHA256
 * signature covers the expiry timestamp. Nothing sensitive is stored in the
 * cookie; tampering is detected by re-computing the signature.
 */

export const SESSION_COOKIE = "kodisalama_session";

export const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
export const REMEMBER_ME_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 8) {
    throw new Error(
      `${name} is missing or too short. Set it in your .env file (see .env.example).`
    );
  }
  return value;
}

export function getAppPassword(): string {
  return getRequiredEnv("APP_PASSWORD");
}

export function getSessionSecret(): string {
  return getRequiredEnv("APP_SESSION_SECRET");
}

export function authConfigured(): boolean {
  const password = process.env.APP_PASSWORD ?? "";
  const secret = process.env.APP_SESSION_SECRET ?? "";
  return password.length >= 8 && secret.length >= 16;
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

/** Create a signed session token valid for `ttlMs`. */
export async function createSessionToken(
  secret: string,
  ttlMs: number = DEFAULT_SESSION_TTL_MS
): Promise<string> {
  const expiresAt = Date.now() + ttlMs;
  const sig = await hmacHex(secret, String(expiresAt));
  return `${expiresAt}.${sig}`;
}

/** Verify a session token; returns true only if valid and unexpired. */
export async function verifySessionToken(
  token: string | undefined | null,
  secret: string
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expiresStr = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expiresAt = Number(expiresStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = await hmacHex(secret, expiresStr);
  return timingSafeEqualStr(sig, expected);
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
