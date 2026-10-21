import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  SESSION_COOKIE,
  getSessionSecret,
  createSessionToken,
  DEFAULT_SESSION_TTL_MS,
  REMEMBER_ME_TTL_MS,
} from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { RateLimiter, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Open signup — cap new accounts per IP to blunt automated abuse.
const limiter = new RateLimiter(60 * 60 * 1000, 5); // 5 signups / hour / IP

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/;

function normalizeEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export async function POST(req: NextRequest) {
  const now = Date.now();
  const ip = clientIp((n) => req.headers.get(n));
  if (limiter.exceeded(ip, now)) {
    return NextResponse.json(
      { error: "Usajili mwingi mno kutoka mtandao huu. Jaribu baada ya saa moja." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ombi si sahihi." }, { status: 400 });
  }

  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const remember = body.remember === true;

  if (fullName.length < 2 || fullName.length > 120) {
    return NextResponse.json(
      { error: "Jina kamili linahitajika (herufi 2 hadi 120)." },
      { status: 400 }
    );
  }
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Barua pepe si sahihi." },
      { status: 400 }
    );
  }
  if (password.length < 8 || password.length > 200) {
    return NextResponse.json(
      { error: "Neno la siri linahitaji herufi 8 au zaidi." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);

  let userId: number;
  try {
    const inserted = await db
      .insert(users)
      .values({ email, passwordHash, fullName })
      .returning({ id: users.id });
    userId = inserted[0].id;
  } catch (e) {
    // Postgres unique_violation — the email is already registered. Drizzle
    // wraps driver errors, so check both the error and its cause.
    const pgCode = (code: unknown): string | undefined =>
      typeof code === "string" ? code : undefined;
    const err = e as { code?: unknown; cause?: { code?: unknown } };
    if (pgCode(err.code) === "23505" || pgCode(err.cause?.code) === "23505") {
      return NextResponse.json(
        { error: "Barua pepe hii imekwisha tumika. Ingia au tumia nyingine." },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kuunda akaunti." }, { status: 500 });
  }

  limiter.hit(ip, now);

  const ttl = remember ? REMEMBER_ME_TTL_MS : DEFAULT_SESSION_TTL_MS;
  const token = await createSessionToken(getSessionSecret(), userId, ttl);
  const isProd = process.env.NODE_ENV === "production";

  const res = NextResponse.json({ ok: true, fullName }, { status: 201 });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: Math.floor(ttl / 1000),
  });
  return res;
}
