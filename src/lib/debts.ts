import { db } from "@/db";
import { tenants, payments, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";

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

function monthsBetween(start: Date, end: Date): number {
  const y = end.getFullYear() - start.getFullYear();
  const m = end.getMonth() - start.getMonth();
  let total = y * 12 + m + 1; // inclusive of current month
  // If end day is before start day in month, still count current as due for rent systems often
  if (total < 0) return 0;
  return total;
}

export async function computeDebts(): Promise<TenantDebt[]> {
  const allTenants = await db
    .select()
    .from(tenants)
    .where(eq(tenants.status, "active"));
  const allPayments = await db.select().from(payments);
  const allRooms = await db.select().from(rooms);
  const roomMap = new Map(allRooms.map((r) => [r.id, r]));

  const now = new Date();

  return allTenants.map((t) => {
    const room = t.roomId ? roomMap.get(t.roomId) : null;
    const rent = t.monthlyRent || room?.monthlyRent || 0;
    const tenantPayments = allPayments.filter((p) => p.tenantId === t.id);
    const paidTotal = tenantPayments.reduce((s, p) => s + (p.amount || 0), 0);

    let monthsDue = 0;
    if (t.moveInDate) {
      const start = new Date(String(t.moveInDate));
      if (!isNaN(start.getTime())) {
        monthsDue = monthsBetween(start, now);
      }
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
