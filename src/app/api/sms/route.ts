import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { smsTemplates, landlordProfile, tenants, rooms, payments } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import {
  DEFAULT_RECEIPT_TEMPLATE,
  DEFAULT_REMINDER_TEMPLATE,
  formatTZS,
  formatDate,
  paymentMethodLabel,
} from "@/lib/utils";
import { str, optStr } from "@/lib/validate";
import { getSessionUserId } from "@/lib/auth";
import { unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const templates = await db
      .select()
      .from(smsTemplates)
      .where(eq(smsTemplates.ownerId, userId));
    const receipt =
      templates.find((t) => t.type === "receipt")?.content ?? DEFAULT_RECEIPT_TEMPLATE;
    const reminder =
      templates.find((t) => t.type === "reminder")?.content ?? DEFAULT_REMINDER_TEMPLATE;

    return NextResponse.json({ receipt, reminder });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kupata templeti" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const body = await req.json();
    const action = body.action as string;

    if (action === "save_templates") {
      const receipt = str(body.receipt, 5000) || DEFAULT_RECEIPT_TEMPLATE;
      const reminder = str(body.reminder, 5000) || DEFAULT_REMINDER_TEMPLATE;

      for (const [type, content] of [
        ["receipt", receipt],
        ["reminder", reminder],
      ] as const) {
        const existing = await db
          .select()
          .from(smsTemplates)
          .where(and(eq(smsTemplates.ownerId, userId), eq(smsTemplates.type, type)));
        if (existing[0]) {
          await db
            .update(smsTemplates)
            .set({ content, updatedAt: new Date() })
            .where(and(eq(smsTemplates.id, existing[0].id), eq(smsTemplates.ownerId, userId)));
        } else {
          await db
            .insert(smsTemplates)
            .values({ ownerId: userId, type, content });
        }
      }
      return NextResponse.json({ ok: true });
    }

    if (action === "generate") {
      const type = (body.type as string) || "receipt";
      const tenantId = parseInt(String(body.tenantId), 10);
      const paymentId = body.paymentId
        ? parseInt(String(body.paymentId), 10)
        : null;

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

      let payment = null;
      if (paymentId && !isNaN(paymentId)) {
        const payRows = await db
          .select()
          .from(payments)
          .where(and(eq(payments.id, paymentId), eq(payments.ownerId, userId)));
        payment = payRows[0] ?? null;
      }

      const landlord = await db
        .select()
        .from(landlordProfile)
        .where(eq(landlordProfile.ownerId, userId))
        .orderBy(desc(landlordProfile.id))
        .limit(1);

      const templates = await db
        .select()
        .from(smsTemplates)
        .where(eq(smsTemplates.ownerId, userId));
      let template =
        type === "reminder"
          ? templates.find((t) => t.type === "reminder")?.content ??
            DEFAULT_REMINDER_TEMPLATE
          : templates.find((t) => t.type === "receipt")?.content ??
            DEFAULT_RECEIPT_TEMPLATE;

      if (body.customTemplate) {
        template = str(body.customTemplate, 5000) || template;
      }

      const vars: Record<string, string> = {
        tenant_name: tenant.fullName,
        room_name: room?.name ?? "—",
        amount: formatTZS(payment?.amount ?? tenant.monthlyRent),
        date: formatDate(payment?.paymentDate ?? new Date()),
        method: payment ? paymentMethodLabel(payment.method) : "—",
        reference: payment?.reference ?? "—",
        period: payment?.periodMonth ?? "—",
        landlord_name: landlord[0]?.fullName ?? "Mwenye Nyumba",
        landlord_phone: landlord[0]?.phone ?? "",
        phone: tenant.phone,
      };

      let message = template;
      for (const [k, v] of Object.entries(vars)) {
        message = message.replaceAll(`{{${k}}}`, v);
      }

      return NextResponse.json({
        message,
        phone: tenant.phone,
        tenantName: tenant.fullName,
        charCount: message.length,
        smsCount: Math.max(1, Math.ceil(message.length / 160)),
      });
    }

    return NextResponse.json({ error: "Kitendo hakijulikani" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kutengeneza ujumbe" }, { status: 500 });
  }
}
