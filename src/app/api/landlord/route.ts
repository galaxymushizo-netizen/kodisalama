import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { landlordProfile } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { str, optStr, isPhone } from "@/lib/validate";
import { getSessionUserId } from "@/lib/auth";
import { unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const rows = await db
      .select()
      .from(landlordProfile)
      .where(eq(landlordProfile.ownerId, userId))
      .orderBy(desc(landlordProfile.id))
      .limit(1);
    return NextResponse.json(rows[0] ?? null);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kupata wasifu" }, { status: 500 });
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
    const location = optStr(body.location, 200);

    if (!fullName || fullName.length < 2) {
      return NextResponse.json(
        { error: "Jina kamili linahitajika (angalau herufi 2)" },
        { status: 400 }
      );
    }
    if (!phone || !isPhone(phone)) {
      return NextResponse.json(
        { error: "Namba ya simu sahihi inahitajika" },
        { status: 400 }
      );
    }

    const existing = await db
      .select()
      .from(landlordProfile)
      .where(eq(landlordProfile.ownerId, userId))
      .orderBy(desc(landlordProfile.id))
      .limit(1);

    let result;
    if (existing[0]) {
      result = await db
        .update(landlordProfile)
        .set({
          fullName,
          phone,
          nida,
          location,
          updatedAt: new Date(),
        })
        .where(and(eq(landlordProfile.id, existing[0].id), eq(landlordProfile.ownerId, userId)))
        .returning();
    } else {
      result = await db
        .insert(landlordProfile)
        .values({ ownerId: userId, fullName, phone, nida, location })
        .returning();
    }

    return NextResponse.json(result[0]);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kuhifadhi wasifu" }, { status: 500 });
  }
}
