import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { smsConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import { str, optStr } from "@/lib/validate";
import { getSessionUserId } from "@/lib/auth";
import { unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Per-landlord SMS gateway settings. The API key is write-only: clients can
 * set it but it is never returned, only a "configured" flag.
 */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const rows = await db
      .select()
      .from(smsConfig)
      .where(eq(smsConfig.ownerId, userId))
      .limit(1);
    const cfg = rows[0];
    if (!cfg) {
      return NextResponse.json({ configured: false });
    }
    return NextResponse.json({
      configured: true,
      provider: cfg.provider,
      username: cfg.username,
      senderId: cfg.senderId,
      sandbox: cfg.sandbox,
      updatedAt: cfg.updatedAt,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kupata mipangilio ya SMS" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const username = str(body.username, 100);
    const apiKey = str(body.apiKey, 300);
    const senderId = optStr(body.senderId, 11);
    const sandbox = body.sandbox !== false; // default true (safe)

    if (!username) {
      return NextResponse.json(
        { error: "Jina la mtumiaji (username) la provider linahitajika" },
        { status: 400 }
      );
    }
    if (senderId && !/^[A-Za-z0-9]{1,11}$/.test(senderId)) {
      return NextResponse.json(
        { error: "Sender ID iwe herufi/namba hadi 11 (mfano KODISALAMA)" },
        { status: 400 }
      );
    }

    const rows = await db
      .select()
      .from(smsConfig)
      .where(eq(smsConfig.ownerId, userId))
      .limit(1);
    const existing = rows[0];

    if (existing) {
      await db
        .update(smsConfig)
        .set({
          username,
          // Empty key means "keep the saved one"
          apiKey: apiKey || existing.apiKey,
          senderId,
          sandbox,
          updatedAt: new Date(),
        })
        .where(eq(smsConfig.id, existing.id));
    } else {
      if (!apiKey) {
        return NextResponse.json(
          { error: "API key ya provider inahitajika mara ya kwanza" },
          { status: 400 }
        );
      }
      await db.insert(smsConfig).values({
        ownerId: userId,
        provider: "africastalking",
        username,
        apiKey,
        senderId,
        sandbox,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kuhifadhi mipangilio ya SMS" }, { status: 500 });
  }
}
