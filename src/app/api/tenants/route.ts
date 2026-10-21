import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tenants, rooms } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  str,
  optStr,
  int,
  isPhone,
  isIsoDate,
  TENANT_STATUSES,
} from "@/lib/validate";
import { getSessionUserId } from "@/lib/auth";
import { unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const status = searchParams.get("status"); // active | moved_out | all

    const allTenants = await db
      .select()
      .from(tenants)
      .where(eq(tenants.ownerId, userId))
      .orderBy(desc(tenants.id));
    const allRooms = await db
      .select()
      .from(rooms)
      .where(eq(rooms.ownerId, userId));
    const roomMap = new Map(allRooms.map((r) => [r.id, r]));

    let result = allTenants.map((t) => ({
      ...t,
      room: t.roomId ? roomMap.get(t.roomId) ?? null : null,
    }));

    if (status === "active") {
      result = result.filter((t) => t.status === "active");
    } else if (status === "moved_out") {
      result = result.filter((t) => t.status === "moved_out");
    }

    if (q) {
      result = result.filter(
        (t) =>
          t.fullName.toLowerCase().includes(q) ||
          t.phone.toLowerCase().includes(q) ||
          (t.nida ?? "").toLowerCase().includes(q) ||
          (t.room?.name ?? "").toLowerCase().includes(q)
      );
    }

    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kupata wapangaji" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const fullName = str(body.fullName, 120);
    const phone = str(body.phone, 24);
    const nida = optStr(body.nida, 32);
    const roomId = int(body.roomId);
    const monthlyRent = int(body.monthlyRent ?? 0);
    const deposit = int(body.deposit ?? 0) ?? 0;
    const moveInDate = optStr(body.moveInDate, 10);
    const notes = optStr(body.notes, 2000);

    if (!fullName || fullName.length < 2) {
      return NextResponse.json({ error: "Jina kamili linahitajika" }, { status: 400 });
    }
    if (!phone || !isPhone(phone)) {
      return NextResponse.json({ error: "Namba ya simu sahihi inahitajika" }, { status: 400 });
    }
    if (monthlyRent === null || monthlyRent < 0) {
      return NextResponse.json({ error: "Kodi ya mwezi si sahihi" }, { status: 400 });
    }
    if (deposit < 0) {
      return NextResponse.json({ error: "Dhamana si sahihi" }, { status: 400 });
    }
    if (moveInDate && !isIsoDate(moveInDate)) {
      return NextResponse.json(
        { error: "Tarehe ya kuingia si sahihi (tumia YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    if (roomId !== null && (roomId < 1 || isNaN(roomId))) {
      return NextResponse.json({ error: "Chumba si sahihi" }, { status: 400 });
    }

    // If assigning room, ensure it's free (room must belong to this owner)
    if (roomId) {
      const roomRows = await db
        .select()
        .from(rooms)
        .where(and(eq(rooms.id, roomId), eq(rooms.ownerId, userId)));
      if (!roomRows[0]) {
        return NextResponse.json({ error: "Chumba hakipatikani" }, { status: 400 });
      }
      const occupying = await db
        .select()
        .from(tenants)
        .where(and(eq(tenants.ownerId, userId), eq(tenants.roomId, roomId)));
      if (occupying.some((t) => t.status === "active")) {
        return NextResponse.json(
          { error: "Chumba hiki tayari kina mpangaji" },
          { status: 400 }
        );
      }
      // mark room occupied
      await db
        .update(rooms)
        .set({ status: "occupied" })
        .where(and(eq(rooms.id, roomId), eq(rooms.ownerId, userId)));
    }

    const result = await db
      .insert(tenants)
      .values({
        ownerId: userId,
        fullName,
        phone,
        nida,
        roomId: roomId && !isNaN(roomId) ? roomId : null,
        monthlyRent,
        deposit,
        moveInDate,
        notes,
        status: "active",
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kusajili mpangaji" }, { status: 500 });
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

    const existing = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, id), eq(tenants.ownerId, userId)));
    if (!existing[0]) {
      return NextResponse.json({ error: "Mpangaji hapatikani" }, { status: 404 });
    }
    const prev = existing[0];

    const updates: Record<string, unknown> = {};
    if (body.fullName !== undefined) {
      const v = str(body.fullName, 120);
      if (v.length < 2) {
        return NextResponse.json({ error: "Jina kamili linahitajika" }, { status: 400 });
      }
      updates.fullName = v;
    }
    if (body.phone !== undefined) {
      const v = str(body.phone, 24);
      if (!isPhone(v)) {
        return NextResponse.json({ error: "Namba ya simu sahihi inahitajika" }, { status: 400 });
      }
      updates.phone = v;
    }
    if (body.nida !== undefined) updates.nida = optStr(body.nida, 32);
    if (body.monthlyRent !== undefined) {
      const v = int(body.monthlyRent);
      if (v === null || v < 0) {
        return NextResponse.json({ error: "Kodi ya mwezi si sahihi" }, { status: 400 });
      }
      updates.monthlyRent = v;
    }
    if (body.deposit !== undefined) {
      const v = int(body.deposit);
      if (v === null || v < 0) {
        return NextResponse.json({ error: "Dhamana si sahihi" }, { status: 400 });
      }
      updates.deposit = v;
    }
    if (body.moveInDate !== undefined) {
      const v = optStr(body.moveInDate, 10);
      if (v && !isIsoDate(v)) {
        return NextResponse.json({ error: "Tarehe si sahihi (YYYY-MM-DD)" }, { status: 400 });
      }
      updates.moveInDate = v;
    }
    if (body.notes !== undefined) updates.notes = optStr(body.notes, 2000);
    if (body.status !== undefined) {
      const v = str(body.status, 20);
      if (!TENANT_STATUSES.has(v)) {
        return NextResponse.json({ error: "Hali si sahihi" }, { status: 400 });
      }
      updates.status = v;
    }

    // Handle room change (rooms must belong to this owner)
    if (body.roomId !== undefined) {
      const newRoomId =
        body.roomId === null || body.roomId === "" ? null : int(body.roomId);

      if (newRoomId !== null && (newRoomId < 1 || !Number.isFinite(newRoomId))) {
        return NextResponse.json({ error: "Chumba si sahihi" }, { status: 400 });
      }

      if (newRoomId !== prev.roomId) {
        // free old room
        if (prev.roomId) {
          await db
            .update(rooms)
            .set({ status: "empty" })
            .where(and(eq(rooms.id, prev.roomId), eq(rooms.ownerId, userId)));
        }
        // occupy new room
        if (newRoomId) {
          const roomRows = await db
            .select()
            .from(rooms)
            .where(and(eq(rooms.id, newRoomId), eq(rooms.ownerId, userId)));
          if (!roomRows[0]) {
            return NextResponse.json({ error: "Chumba hakipatikani" }, { status: 400 });
          }
          const occupying = await db
            .select()
            .from(tenants)
            .where(and(eq(tenants.ownerId, userId), eq(tenants.roomId, newRoomId)));
          if (
            occupying.some((t) => t.status === "active" && t.id !== id)
          ) {
            return NextResponse.json(
              { error: "Chumba hiki tayari kina mpangaji" },
              { status: 400 }
            );
          }
          await db
            .update(rooms)
            .set({ status: "occupied" })
            .where(and(eq(rooms.id, newRoomId), eq(rooms.ownerId, userId)));
        }
        updates.roomId = newRoomId;
      }
    }

    // If moving out, free room
    if (body.status === "moved_out" && prev.roomId) {
      await db
        .update(rooms)
        .set({ status: "empty" })
        .where(and(eq(rooms.id, prev.roomId), eq(rooms.ownerId, userId)));
      updates.roomId = null;
    }

    const result = await db
      .update(tenants)
      .set(updates)
      .where(and(eq(tenants.id, id), eq(tenants.ownerId, userId)))
      .returning();

    return NextResponse.json(result[0]);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kusasisha mpangaji" }, { status: 500 });
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

    const existing = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, id), eq(tenants.ownerId, userId)));
    if (!existing[0]) {
      return NextResponse.json({ error: "Mpangaji hapatikani" }, { status: 404 });
    }
    if (existing[0].roomId) {
      await db
        .update(rooms)
        .set({ status: "empty" })
        .where(and(eq(rooms.id, existing[0].roomId), eq(rooms.ownerId, userId)));
    }

    await db
      .delete(tenants)
      .where(and(eq(tenants.id, id), eq(tenants.ownerId, userId)));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kufuta mpangaji" }, { status: 500 });
  }
}
