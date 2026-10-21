import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { rooms, tenants } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { str, optStr, int, ROOM_STATUSES } from "@/lib/validate";
import { getSessionUserId } from "@/lib/auth";
import { unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const status = searchParams.get("status"); // empty | occupied | all

    const allRooms = await db
      .select()
      .from(rooms)
      .where(eq(rooms.ownerId, userId))
      .orderBy(desc(rooms.id));

    // Get active tenants mapped by room
    const activeTenants = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.ownerId, userId), eq(tenants.status, "active")));

    const tenantByRoom = new Map(
      activeTenants.filter((t) => t.roomId != null).map((t) => [t.roomId!, t])
    );

    let result = allRooms.map((r) => {
      const t = tenantByRoom.get(r.id);
      return {
        ...r,
        tenant: t
          ? { id: t.id, fullName: t.fullName, phone: t.phone }
          : null,
        effectiveStatus: t ? "occupied" : "empty",
      };
    });

    if (status === "empty") {
      result = result.filter((r) => r.effectiveStatus === "empty");
    } else if (status === "occupied") {
      result = result.filter((r) => r.effectiveStatus === "occupied");
    }

    if (q) {
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.tenant?.fullName ?? "").toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q)
      );
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kupata vyumba" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const name = str(body.name, 120);
    const monthlyRent = int(body.monthlyRent ?? 0);
    const description = optStr(body.description, 500);

    if (!name) {
      return NextResponse.json({ error: "Jina la chumba linahitajika" }, { status: 400 });
    }
    if (monthlyRent === null || monthlyRent < 0) {
      return NextResponse.json({ error: "Kodi ya mwezi si sahihi" }, { status: 400 });
    }

    const result = await db
      .insert(rooms)
      .values({
        ownerId: userId,
        name,
        monthlyRent,
        description,
        status: "empty",
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kusajili chumba" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const id = parseInt(String(body.id), 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Kitambulisho si sahihi" }, { status: 400 });
    }

    const updates: Partial<{
      name: string;
      monthlyRent: number;
      description: string | null;
      status: string;
    }> = {};

    if (body.name !== undefined) {
      const v = str(body.name, 120);
      if (!v) {
        return NextResponse.json({ error: "Jina la chumba linahitajika" }, { status: 400 });
      }
      updates.name = v;
    }
    if (body.monthlyRent !== undefined) {
      const v = int(body.monthlyRent);
      if (v === null || v < 0) {
        return NextResponse.json({ error: "Kodi ya mwezi si sahihi" }, { status: 400 });
      }
      updates.monthlyRent = v;
    }
    if (body.description !== undefined) updates.description = optStr(body.description, 500);
    if (body.status !== undefined) {
      const v = str(body.status, 20);
      if (!ROOM_STATUSES.has(v)) {
        return NextResponse.json({ error: "Hali si sahihi" }, { status: 400 });
      }
      updates.status = v;
    }

    const result = await db
      .update(rooms)
      .set(updates)
      .where(and(eq(rooms.id, id), eq(rooms.ownerId, userId)))
      .returning();

    if (!result[0]) {
      return NextResponse.json({ error: "Chumba hakipatikani" }, { status: 404 });
    }
    return NextResponse.json(result[0]);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kusasisha chumba" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") ?? "", 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Kitambulisho si sahihi" }, { status: 400 });
    }

    // Check if room has active tenant
    const active = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.ownerId, userId), eq(tenants.roomId, id)));
    const hasActive = active.some((t) => t.status === "active");
    if (hasActive) {
      return NextResponse.json(
        { error: "Huwezi kufuta chumba kilicho na mpangaji hai" },
        { status: 400 }
      );
    }

    const deleted = await db
      .delete(rooms)
      .where(and(eq(rooms.id, id), eq(rooms.ownerId, userId)))
      .returning({ id: rooms.id });
    if (!deleted[0]) {
      return NextResponse.json({ error: "Chumba hakipatikani" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kufuta chumba" }, { status: 500 });
  }
}
