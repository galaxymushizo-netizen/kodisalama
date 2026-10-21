import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { smsConfig, smsLogs, tenants } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { str } from "@/lib/validate";
import { getSessionUserId } from "@/lib/auth";
import { unauthorized } from "@/lib/api";
import { RateLimiter } from "@/lib/rate-limit";
import { normalizeTzPhone, sendSms } from "@/lib/sms";

export const dynamic = "force-dynamic";

/** Abuse guard: 30 gateway sends per hour per account. */
const limiter = new RateLimiter(60 * 60 * 1000, 30);

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  if (limiter.exceeded(`sms:${userId}`)) {
    return NextResponse.json(
      { error: "Umetuma ujumbe wengi mno — subiri kidogo (muda wa saa 1)." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const tenantId = parseInt(String(body.tenantId), 10);
    const message = str(body.message, 1600);
    const kindRaw = str(body.kind, 20);
    const kind = ["receipt", "reminder", "custom"].includes(kindRaw) ? kindRaw : "custom";

    if (isNaN(tenantId)) {
      return NextResponse.json({ error: "Chagua mpangaji" }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "Ujumbe ni mtupu" }, { status: 400 });
    }

    const tenantRows = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, tenantId), eq(tenants.ownerId, userId)))
      .limit(1);
    const tenant = tenantRows[0];
    if (!tenant) {
      return NextResponse.json({ error: "Mpangaji hapatikani" }, { status: 404 });
    }

    const cfgRows = await db
      .select()
      .from(smsConfig)
      .where(eq(smsConfig.ownerId, userId))
      .limit(1);
    const cfg = cfgRows[0];
    if (!cfg) {
      return NextResponse.json(
        { error: "Sanidi Gateway ya SMS kwanza (kichupo cha Gateway)." },
        { status: 400 }
      );
    }

    const to = normalizeTzPhone(tenant.phone);
    if (!to) {
      return NextResponse.json(
        { error: `Namba ya mpangaji "${tenant.phone}" si sahihi kwa SMS gateway` },
        { status: 400 }
      );
    }

    const outcome = await sendSms(
      {
        username: cfg.username,
        apiKey: cfg.apiKey,
        senderId: cfg.senderId,
        sandbox: cfg.sandbox,
      },
      to,
      message
    );

    await db.insert(smsLogs).values({
      ownerId: userId,
      tenantId: tenant.id,
      phone: to,
      message,
      kind,
      status: outcome.ok ? "sent" : "failed",
      providerRef: outcome.ok ? outcome.providerRef : null,
      cost: outcome.ok ? outcome.cost : null,
      errorText: outcome.ok ? null : outcome.error,
    });

    limiter.hit(`sms:${userId}`);

    if (!outcome.ok) {
      return NextResponse.json({ ok: false, error: outcome.error }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      to,
      providerRef: outcome.providerRef,
      status: outcome.status,
      cost: outcome.cost,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kutuma SMS" }, { status: 500 });
  }
}
