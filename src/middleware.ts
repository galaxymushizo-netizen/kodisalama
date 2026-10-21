import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  verifySessionToken,
  authConfigured,
} from "@/lib/auth";

/**
 * Protects every page and API route. Unauthenticated visitors are redirected
 * to /login (pages) or get a 401 JSON response (API). Auth endpoints and
 * health checks stay open. Each signed-in visitor carries a signed session
 * bound to their user id; API routes additionally scope every query by that
 * id (defense in depth).
 */

const PUBLIC_PATHS = new Set<string>([
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/health",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/emblems") ||
    pathname === "/favicon.svg" ||
    pathname === "/favicon.ico"
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // Fail closed: if auth is not configured, nothing else is reachable.
  if (!authConfigured()) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error:
            "Authentication is not configured. Set APP_SESSION_SECRET (see .env.example).",
        },
        { status: 503 }
      );
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.APP_SESSION_SECRET ?? "";
  const userId = await verifySessionToken(token, secret);

  if (userId !== null) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Hitaji kuingia (unauthorized)." }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next).*)"],
};
