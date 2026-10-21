import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  SESSION_COOKIE,
  getSessionSecret,
  createSessionToken,
  DEFAULT_SESSION_TTL_MS,
  REMEMBER_ME_TTL_MS,
} from "@/lib/auth";
import { verifyPassword, fakeVerify } from "@/lib/password";
import { RateLimiter, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Max 5 failed attempts per IP per 15 minutes.
const limiter = new RateLimiter(15 * 60 * 1000, 5);

export async function POST(req: NextRequest) {
  const now = Date.now();
  const ip = clientIp((n) => req.headers.get(n));
  if (limiter.exceeded(ip, now)) {
    return NextResponse.json(
      { error: "Majaribio mengi mno. Subiri dakika 15 kisha ujaribu tena." },
      { status: 429 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ombi si sahihi." }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const remember = body.remember === true;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Weka barua pepe na neno la siri." },
      { status: 400 }
    );
  }

  const rows = await db
    .select({ id: users.id, passwordHash: users.passwordHash, fullName: users.fullName })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  const user = rows[0];
  const ok = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !ok) {
    if (!user) await fakeVerify(); // equalize timing for unknown emails
    limiter.hit(ip, now);
    // Small constant delay to blunt online guessing without hurting UX much.
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json(
      { error: "Barua pepe au neno la siri si sahihi." },
      { status: 401 }
    );
  }

  limiter.clear(ip);
  const ttl = remember ? REMEMBER_ME_TTL_MS : DEFAULT_SESSION_TTL_MS;
  const token = await createSessionToken(getSessionSecret(), user.id, ttl);
  const isProd = process.env.NODE_ENV === "production";

  const res = NextResponse.json({ ok: true, fullName: user.fullName });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: Math.floor(ttl / 1000),
  });
  return res;
}
