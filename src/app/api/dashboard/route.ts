import { NextResponse } from "next/server";
import { db } from "@/db";
import { rooms, tenants, payments } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { currentPeriodMonth, currentMonthLabel } from "@/lib/utils";
import { computeDebts } from "@/lib/debts";
import { getSessionUserId } from "@/lib/auth";
import { unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const allRooms = await db.select().from(rooms).where(eq(rooms.ownerId, userId));
    const allTenants = await db
      .select()
      .from(tenants)
      .where(eq(tenants.ownerId, userId));
    const allPayments = await db
      .select()
      .from(payments)
      .where(eq(payments.ownerId, userId))
      .orderBy(desc(payments.id));

    const activeTenants = allTenants.filter((t) => t.status === "active");
    const occupiedRoomIds = new Set(
      activeTenants.filter((t) => t.roomId != null).map((t) => t.roomId!)
    );
    const totalRooms = allRooms.length;
    const occupied = occupiedRoomIds.size;
    const empty = Math.max(0, totalRooms - occupied);
    const occupancyRate =
      totalRooms === 0 ? 0 : Math.round((occupied / totalRooms) * 100);

    const period = currentPeriodMonth();
    const monthPayments = allPayments.filter((p) => {
      if (p.periodMonth === period) return true;
      if (p.paymentDate) {
        const d = String(p.paymentDate).slice(0, 7);
        return d === period;
      }
      return false;
    });
    const monthRevenue = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const allTimeRevenue = allPayments.reduce((s, p) => s + (p.amount || 0), 0);

    const debts = await computeDebts(userId);
    const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
    const overdueCount = debts.filter((d) => d.balance > 0).length;
    const topDebts = debts
      .filter((d) => d.balance > 0)
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);

    const tenantMap = new Map(allTenants.map((t) => [t.id, t]));
    const roomMap = new Map(allRooms.map((r) => [r.id, r]));
    const recentPayments = allPayments.slice(0, 5).map((p) => {
      const t = tenantMap.get(p.tenantId);
      const r = p.roomId
        ? roomMap.get(p.roomId)
        : t?.roomId
          ? roomMap.get(t.roomId)
          : null;
      return {
        id: p.id,
        amount: p.amount,
        paymentDate: p.paymentDate,
        method: p.method,
        tenantName: t?.fullName ?? "—",
        roomName: r?.name ?? null,
      };
    });

    const expectedMonthRent = activeTenants.reduce(
      (s, t) => s + (t.monthlyRent || 0),
      0
    );
    const collectionRate =
      expectedMonthRent <= 0
        ? 0
        : Math.min(100, Math.round((monthRevenue / expectedMonthRent) * 100));

    return NextResponse.json({
      totalRooms,
      occupied,
      empty,
      occupancyRate,
      activeTenants: activeTenants.length,
      monthRevenue,
      allTimeRevenue,
      monthLabel: currentMonthLabel("sw"),
      period,
      totalDebt,
      overdueCount,
      topDebts,
      recentPayments,
      expectedMonthRent,
      collectionRate,
      paymentCount: allPayments.length,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kupata dashibodi" }, { status: 500 });
  }
}
