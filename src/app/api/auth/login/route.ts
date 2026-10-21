import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import {
  SESSION_COOKIE,
  getAppPassword,
  getSessionSecret,
  createSessionToken,
  timingSafeEqualStr,
  DEFAULT_SESSION_TTL_MS,
  REMEMBER_ME_TTL_MS,
  authConfigured,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * In-memory login rate limit: max 5 failed attempts per IP per 15 minutes.
 * Good enough for a self-hosted single-tenant deployment.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, number[]>();

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function pruneAttempts(now: number) {
  for (const [ip, list] of attempts) {
    const recent = list.filter((t) => now - t < WINDOW_MS);
    if (recent.length === 0) attempts.delete(ip);
    else attempts.set(ip, recent);
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(req: NextRequest) {
  if (!authConfigured()) {
    return NextResponse.json(
      {
        error:
          "Authentication is not configured. Set APP_PASSWORD and APP_SESSION_SECRET (see .env.example).",
      },
      { status: 503 }
    );
  }

  const now = Date.now();
  pruneAttempts(now);
  const ip = clientIp(req);
  const recent = attempts.get(ip) ?? [];
  if (recent.length >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Majaribio mengi mno. Subiri dakika 15 kisha ujaribu tena." },
      { status: 429 }
    );
  }

  let body: { password?: unknown; remember?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ombi si sahihi." }, { status: 400 });
  }

  const provided = typeof body.password === "string" ? body.password : "";
  const remember = body.remember === true;
  const expected = getAppPassword();

  // Compare SHA-256 digests with a constant-time comparator to avoid
  // leaking timing information about the password.
  const ok = timingSafeEqualStr(sha256(provided), sha256(expected));
  if (!ok) {
    attempts.set(ip, [...recent, now]);
    // Small constant delay to blunt online guessing without hurting UX much.
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: "Neno la siri si sahihi." }, { status: 401 });
  }

  attempts.delete(ip);
  const ttl = remember ? REMEMBER_ME_TTL_MS : DEFAULT_SESSION_TTL_MS;
  const token = await createSessionToken(getSessionSecret(), ttl);

  const isProd = process.env.NODE_ENV === "production";
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: Math.floor(ttl / 1000),
  });
  return res;
}
