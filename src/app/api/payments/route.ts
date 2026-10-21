import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { payments, tenants, rooms } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { str, optStr, int, isIsoDate, isPeriodMonth, isPaymentMethod } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const tenantId = searchParams.get("tenantId");
    const method = searchParams.get("method");

    const allPayments = await db.select().from(payments).orderBy(desc(payments.id));
    const allTenants = await db.select().from(tenants);
    const allRooms = await db.select().from(rooms);
    const tenantMap = new Map(allTenants.map((t) => [t.id, t]));
    const roomMap = new Map(allRooms.map((r) => [r.id, r]));

    let result = allPayments.map((p) => {
      const t = tenantMap.get(p.tenantId);
      const r = p.roomId ? roomMap.get(p.roomId) : t?.roomId ? roomMap.get(t.roomId) : null;
      return {
        ...p,
        tenant: t
          ? { id: t.id, fullName: t.fullName, phone: t.phone }
          : null,
        room: r ? { id: r.id, name: r.name } : null,
      };
    });

    if (tenantId) {
      const tid = parseInt(tenantId, 10);
      result = result.filter((p) => p.tenantId === tid);
    }
    if (method && method !== "all") {
      result = result.filter((p) => p.method === method);
    }
    if (q) {
      result = result.filter(
        (p) =>
          (p.tenant?.fullName ?? "").toLowerCase().includes(q) ||
          (p.room?.name ?? "").toLowerCase().includes(q) ||
          (p.reference ?? "").toLowerCase().includes(q) ||
          (p.notes ?? "").toLowerCase().includes(q)
      );
    }

    const total = result.reduce((sum, p) => sum + (p.amount || 0), 0);

    return NextResponse.json({ payments: result, total });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kupata malipo" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const tenantId = int(body.tenantId);
    const amount = int(body.amount ?? 0);
    const paymentDate = str(body.paymentDate, 10) || new Date().toISOString().slice(0, 10);
    const method = str(body.method, 20) || "cash";
    const periodMonth = optStr(body.periodMonth, 7);
    const reference = optStr(body.reference, 100);
    const notes = optStr(body.notes, 500);
    let roomId = body.roomId ? int(body.roomId) : null;

    if (tenantId === null || tenantId < 1) {
      return NextResponse.json({ error: "Chagua mpangaji" }, { status: 400 });
    }
    if (amount === null || amount <= 0) {
      return NextResponse.json({ error: "Kiasi cha malipo si sahihi" }, { status: 400 });
    }
    if (!isIsoDate(paymentDate)) {
      return NextResponse.json(
        { error: "Tarehe ya malipo si sahihi (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    if (!isPaymentMethod(method)) {
      return NextResponse.json({ error: "Njia ya malipo si sahihi" }, { status: 400 });
    }
    if (periodMonth && !isPeriodMonth(periodMonth)) {
      return NextResponse.json(
        { error: "Mwezi wa kipindi si sahihi (tumia YYYY-MM)" },
        { status: 400 }
      );
    }

    const tenantRows = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!tenantRows[0]) {
      return NextResponse.json({ error: "Mpangaji hapatikani" }, { status: 404 });
    }
    if (!roomId && tenantRows[0].roomId) {
      roomId = tenantRows[0].roomId;
    }

    const result = await db
      .insert(payments)
      .values({
        tenantId,
        roomId,
        amount,
        paymentDate,
        method,
        periodMonth,
        reference,
        notes,
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kurekodi malipo" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") ?? "", 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Kitambulisho si sahihi" }, { status: 400 });
    }
    await db.delete(payments).where(eq(payments.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kufuta malipo" }, { status: 500 });
  }
}
