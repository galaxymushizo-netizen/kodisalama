import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  landlordProfile,
  rooms,
  tenants,
  payments,
  contractSettings,
  smsTemplates,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUserId } from "@/lib/auth";
import { unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const [landlord, allRooms, allTenants, allPayments, contracts, templates] =
      await Promise.all([
        db.select().from(landlordProfile).where(eq(landlordProfile.ownerId, userId)),
        db.select().from(rooms).where(eq(rooms.ownerId, userId)),
        db.select().from(tenants).where(eq(tenants.ownerId, userId)),
        db.select().from(payments).where(eq(payments.ownerId, userId)),
        db.select().from(contractSettings).where(eq(contractSettings.ownerId, userId)),
        db.select().from(smsTemplates).where(eq(smsTemplates.ownerId, userId)),
      ]);

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      app: "KodiSalama",
      data: {
        landlordProfile: landlord,
        rooms: allRooms,
        tenants: allTenants,
        payments: allPayments,
        contractSettings: contracts,
        smsTemplates: templates,
      },
    };

    return NextResponse.json(payload);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kuhifadhi nakala" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const action = body.action as string;

    if (action === "clear") {
      // Delete this owner's rows in FK-safe order
      await db.delete(payments).where(eq(payments.ownerId, userId));
      await db.delete(tenants).where(eq(tenants.ownerId, userId));
      await db.delete(rooms).where(eq(rooms.ownerId, userId));
      await db.delete(landlordProfile).where(eq(landlordProfile.ownerId, userId));
      await db.delete(contractSettings).where(eq(contractSettings.ownerId, userId));
      await db.delete(smsTemplates).where(eq(smsTemplates.ownerId, userId));
      return NextResponse.json({ ok: true, message: "Data zote zimefutwa" });
    }

    if (action === "import") {
      const data = body.data?.data ?? body.data;
      if (!data || typeof data !== "object") {
        return NextResponse.json({ error: "Faili la nakala si sahihi" }, { status: 400 });
      }

      // Reject absurdly large imports before touching the database.
      const MAX_ROWS = 20_000;
      for (const key of ["rooms", "tenants", "payments"]) {
        const rows = (data as Record<string, unknown>)[key];
        if (Array.isArray(rows) && rows.length > MAX_ROWS) {
          return NextResponse.json(
            { error: `Orodha ya ${key} ni kubwa mno (kikomo: ${MAX_ROWS})` },
            { status: 400 }
          );
        }
      }
      const cleanText = (v: unknown, max: number): string =>
        typeof v === "string" ? v.slice(0, max) : "";
      const cleanOpt = (v: unknown, max: number): string | null => {
        const s = cleanText(v, max);
        return s.length > 0 ? s : null;
      };

      // Clear this owner's existing data first
      await db.delete(payments).where(eq(payments.ownerId, userId));
      await db.delete(tenants).where(eq(tenants.ownerId, userId));
      await db.delete(rooms).where(eq(rooms.ownerId, userId));
      await db.delete(landlordProfile).where(eq(landlordProfile.ownerId, userId));
      await db.delete(contractSettings).where(eq(contractSettings.ownerId, userId));
      await db.delete(smsTemplates).where(eq(smsTemplates.ownerId, userId));

      // Import — strip ids so serials regenerate, keep relations by map
      if (Array.isArray(data.landlordProfile)) {
        for (const row of data.landlordProfile.slice(0, 10)) {
          if (typeof row !== "object" || row === null) continue;
          await db.insert(landlordProfile).values({
            ownerId: userId,
            fullName: cleanText(row.fullName, 120) || "Haijulikani",
            phone: cleanText(row.phone, 24) || "—",
            nida: cleanOpt(row.nida, 32),
            location: cleanOpt(row.location, 200),
          });
        }
      }

      // Map old room ids -> new
      const roomIdMap = new Map<number, number>();
      if (Array.isArray(data.rooms)) {
        for (const row of data.rooms) {
          if (typeof row !== "object" || row === null) continue;
          const inserted = await db
            .insert(rooms)
            .values({
              ownerId: userId,
              name: cleanText(row.name, 120) || "Chumba",
              monthlyRent: Number.isFinite(Number(row.monthlyRent))
                ? Math.max(0, Math.trunc(Number(row.monthlyRent)))
                : 0,
              description: cleanOpt(row.description, 500),
              status: row.status === "occupied" ? "occupied" : "empty",
            })
            .returning();
          if (row.id != null) roomIdMap.set(row.id, inserted[0].id);
        }
      }

      const tenantIdMap = new Map<number, number>();
      if (Array.isArray(data.tenants)) {
        for (const row of data.tenants) {
          if (typeof row !== "object" || row === null) continue;
          const newRoomId =
            row.roomId != null ? roomIdMap.get(row.roomId) ?? null : null;
          const inserted = await db
            .insert(tenants)
            .values({
              ownerId: userId,
              fullName: cleanText(row.fullName, 120) || "Haijulikani",
              phone: cleanText(row.phone, 24) || "—",
              nida: cleanOpt(row.nida, 32),
              photoUrl: cleanOpt(row.photoUrl, 500),
              roomId: newRoomId,
              monthlyRent: Number.isFinite(Number(row.monthlyRent))
                ? Math.max(0, Math.trunc(Number(row.monthlyRent)))
                : 0,
              deposit: Number.isFinite(Number(row.deposit))
                ? Math.max(0, Math.trunc(Number(row.deposit)))
                : 0,
              moveInDate: cleanOpt(row.moveInDate, 10),
              status: row.status === "moved_out" ? "moved_out" : "active",
              notes: cleanOpt(row.notes, 2000),
            })
            .returning();
          if (row.id != null) tenantIdMap.set(row.id, inserted[0].id);
        }
      }

      if (Array.isArray(data.payments)) {
        for (const row of data.payments) {
          if (typeof row !== "object" || row === null) continue;
          const newTenantId = tenantIdMap.get(row.tenantId);
          if (!newTenantId) continue;
          const amount = Number.isFinite(Number(row.amount))
            ? Math.max(0, Math.trunc(Number(row.amount)))
            : 0;
          if (amount <= 0) continue;
          const newRoomId =
            row.roomId != null ? roomIdMap.get(row.roomId) ?? null : null;
          await db.insert(payments).values({
            ownerId: userId,
            tenantId: newTenantId,
            roomId: newRoomId,
            amount,
            paymentDate:
              typeof row.paymentDate === "string" && row.paymentDate.slice(0, 10).match(/^\d{4}-\d{2}-\d{2}$/)
                ? row.paymentDate.slice(0, 10)
                : new Date().toISOString().slice(0, 10),
            method: ["cash", "mpesa", "tigopesa", "airtel", "bank", "other"].includes(row.method)
              ? row.method
              : "other",
            periodMonth: cleanOpt(row.periodMonth, 7),
            reference: cleanOpt(row.reference, 100),
            notes: cleanOpt(row.notes, 500),
          });
        }
      }

      if (Array.isArray(data.contractSettings)) {
        for (const row of data.contractSettings.slice(0, 5)) {
          if (typeof row !== "object" || row === null) continue;
          await db.insert(contractSettings).values({
            ownerId: userId,
            clauses: cleanOpt(row.clauses, 20000),
            defaultDurationMonths: Number.isFinite(Number(row.defaultDurationMonths))
              ? Math.min(120, Math.max(1, Math.trunc(Number(row.defaultDurationMonths))))
              : 12,
            defaultPaymentIntervalMonths: Number.isFinite(Number(row.defaultPaymentIntervalMonths))
              ? Math.min(12, Math.max(1, Math.trunc(Number(row.defaultPaymentIntervalMonths))))
              : 1,
          });
        }
      }

      if (Array.isArray(data.smsTemplates)) {
        for (const row of data.smsTemplates.slice(0, 10)) {
          if (typeof row !== "object" || row === null) continue;
          const type = row.type === "reminder" ? "reminder" : "receipt";
          const content = cleanText(row.content, 5000);
          if (!content) continue;
          await db.insert(smsTemplates).values({ ownerId: userId, type, content });
        }
      }

      return NextResponse.json({ ok: true, message: "Data zimerudishwa kikamilifu" });
    }

    return NextResponse.json({ error: "Kitendo hakijulikani" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kurejesha data" }, { status: 500 });
  }
}
