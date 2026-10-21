import { NextResponse } from "next/server";
import { db } from "@/db";
import { smsLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSessionUserId } from "@/lib/auth";
import { unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Recent SMS history (last 50) for the logged-in landlord. */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const rows = await db
      .select({
        id: smsLogs.id,
        phone: smsLogs.phone,
        message: smsLogs.message,
        kind: smsLogs.kind,
        status: smsLogs.status,
        cost: smsLogs.cost,
        errorText: smsLogs.errorText,
        createdAt: smsLogs.createdAt,
      })
      .from(smsLogs)
      .where(eq(smsLogs.ownerId, userId))
      .orderBy(desc(smsLogs.id))
      .limit(50);

    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kupata historia" }, { status: 500 });
  }
}
