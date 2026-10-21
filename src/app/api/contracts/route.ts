import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contractSettings, landlordProfile, tenants, rooms } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { DEFAULT_CONTRACT_CLAUSES } from "@/lib/utils";
import { str, int } from "@/lib/validate";
import { getSessionUserId } from "@/lib/auth";
import { unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const rows = await db
      .select()
      .from(contractSettings)
      .where(eq(contractSettings.ownerId, userId))
      .orderBy(desc(contractSettings.id))
      .limit(1);

    const landlord = await db
      .select()
      .from(landlordProfile)
      .where(eq(landlordProfile.ownerId, userId))
      .orderBy(desc(landlordProfile.id))
      .limit(1);

    const settings = rows[0] ?? {
      id: 0,
      ownerId: userId,
      clauses: DEFAULT_CONTRACT_CLAUSES,
      defaultDurationMonths: 12,
      defaultPaymentIntervalMonths: 1,
      updatedAt: new Date(),
    };

    return NextResponse.json({
      settings,
      landlord: landlord[0] ?? null,
      defaultClauses: DEFAULT_CONTRACT_CLAUSES,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kupata mkataba" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const clauses = body.clauses != null ? str(body.clauses, 20000) : DEFAULT_CONTRACT_CLAUSES;
    const defaultDurationMonths = int(body.defaultDurationMonths ?? 12) ?? 12;
    const defaultPaymentIntervalMonths = int(body.defaultPaymentIntervalMonths ?? 1) ?? 1;

    if (
      defaultDurationMonths < 1 ||
      defaultDurationMonths > 120 ||
      defaultPaymentIntervalMonths < 1 ||
      defaultPaymentIntervalMonths > 12
    ) {
      return NextResponse.json({ error: "Muda wa mkataba si sahihi" }, { status: 400 });
    }

    const existing = await db
      .select()
      .from(contractSettings)
      .where(eq(contractSettings.ownerId, userId))
      .orderBy(desc(contractSettings.id))
      .limit(1);

    let result;
    if (existing[0]) {
      result = await db
        .update(contractSettings)
        .set({
          clauses,
          defaultDurationMonths,
          defaultPaymentIntervalMonths,
          updatedAt: new Date(),
        })
        .where(and(eq(contractSettings.id, existing[0].id), eq(contractSettings.ownerId, userId)))
        .returning();
    } else {
      result = await db
        .insert(contractSettings)
        .values({
          ownerId: userId,
          clauses,
          defaultDurationMonths,
          defaultPaymentIntervalMonths,
        })
        .returning();
    }

    return NextResponse.json(result[0]);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kuhifadhi mkataba" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  // Generate contract data for a tenant (tenant must belong to the owner)
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const tenantId = parseInt(String(body.tenantId), 10);
    if (isNaN(tenantId)) {
      return NextResponse.json({ error: "Chagua mpangaji" }, { status: 400 });
    }

    const tenantRows = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, tenantId), eq(tenants.ownerId, userId)));
    const tenant = tenantRows[0];
    if (!tenant) {
      return NextResponse.json({ error: "Mpangaji hapatikani" }, { status: 404 });
    }

    let room = null;
    if (tenant.roomId) {
      const roomRows = await db
        .select()
        .from(rooms)
        .where(and(eq(rooms.id, tenant.roomId), eq(rooms.ownerId, userId)));
      room = roomRows[0] ?? null;
    }

    const landlord = await db
      .select()
      .from(landlordProfile)
      .where(eq(landlordProfile.ownerId, userId))
      .orderBy(desc(landlordProfile.id))
      .limit(1);

    const settings = await db
      .select()
      .from(contractSettings)
      .where(eq(contractSettings.ownerId, userId))
      .orderBy(desc(contractSettings.id))
      .limit(1);

    return NextResponse.json({
      tenant,
      room,
      landlord: landlord[0] ?? null,
      clauses: settings[0]?.clauses ?? DEFAULT_CONTRACT_CLAUSES,
      durationMonths:
        body.durationMonths ?? settings[0]?.defaultDurationMonths ?? 12,
      paymentInterval:
        body.paymentInterval ?? settings[0]?.defaultPaymentIntervalMonths ?? 1,
      deposit: body.deposit ?? tenant.deposit ?? 0,
      monthlyRent: body.monthlyRent ?? tenant.monthlyRent ?? room?.monthlyRent ?? 0,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kuunda mkataba" }, { status: 500 });
  }
}
