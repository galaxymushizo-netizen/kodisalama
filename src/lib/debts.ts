import { db } from "@/db";
import { tenants, payments, rooms } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type TenantDebt = {
  tenantId: number;
  fullName: string;
  phone: string;
  roomName: string | null;
  monthlyRent: number;
  monthsDue: number;
  expectedTotal: number;
  paidTotal: number;
  balance: number; // positive = ana deni
  status: "clear" | "partial" | "overdue" | "none";
  moveInDate: string | null;
};

/**
 * Count rent months due from the move-in month through the current month,
 * inclusive. Parsing "YYYY-MM-DD" with `new Date()` would interpret it as UTC
 * midnight and roll the date into the previous month on west-of-Greenwich
 * servers, inflating debts by one month — so read the string directly.
 */
function monthsDueSince(moveInDate: string, now: Date): number {
  const head = moveInDate.slice(0, 10);
  const match = /^(\d{4})-(\d{2})/.exec(head);
  if (!match) return -1; // unparsable — caller falls back
  const startYear = Number(match[1]);
  const startMonth = Number(match[2]); // 1–12
  const endYear = now.getUTCFullYear();
  const endMonth = now.getUTCMonth() + 1; // 1–12
  const total = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  return Math.max(0, total);
}

/** Debt computation scoped strictly to one owner's tenants/payments/rooms. */
export async function computeDebts(ownerId: number): Promise<TenantDebt[]> {
  const allTenants = await db
    .select()
    .from(tenants)
    .where(and(eq(tenants.ownerId, ownerId), eq(tenants.status, "active")));
  const allPayments = await db
    .select()
    .from(payments)
    .where(eq(payments.ownerId, ownerId));
  const allRooms = await db
    .select()
    .from(rooms)
    .where(eq(rooms.ownerId, ownerId));
  const roomMap = new Map(allRooms.map((r) => [r.id, r]));

  const now = new Date();

  return allTenants.map((t) => {
    const room = t.roomId ? roomMap.get(t.roomId) : null;
    const rent = t.monthlyRent || room?.monthlyRent || 0;
    const tenantPayments = allPayments.filter((p) => p.tenantId === t.id);
    const paidTotal = tenantPayments.reduce((s, p) => s + (p.amount || 0), 0);

    let monthsDue = 0;
    if (t.moveInDate) {
      const computed = monthsDueSince(String(t.moveInDate), now);
      monthsDue = computed >= 0 ? computed : rent > 0 ? 1 : 0;
    } else {
      // no move-in date: assume 1 month due if rent > 0
      monthsDue = rent > 0 ? 1 : 0;
    }

    const expectedTotal = rent * monthsDue;
    // deposit is separate; debt is rent expectation minus payments
    const balance = Math.max(0, expectedTotal - paidTotal);

    let status: TenantDebt["status"] = "none";
    if (rent <= 0 || monthsDue <= 0) status = "none";
    else if (balance <= 0) status = "clear";
    else if (paidTotal > 0) status = "partial";
    else status = "overdue";

    return {
      tenantId: t.id,
      fullName: t.fullName,
      phone: t.phone,
      roomName: room?.name ?? null,
      monthlyRent: rent,
      monthsDue,
      expectedTotal,
      paidTotal,
      balance,
      status,
      moveInDate: t.moveInDate ? String(t.moveInDate) : null,
    };
  });
}
