import { NextResponse } from "next/server";
import { db } from "@/db";
import { payments, tenants, rooms } from "@/db/schema";
import { computeDebts } from "@/lib/debts";
import { currentPeriodMonth } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Monthly summary report for landlord */
export async function GET() {
  try {
    const allPayments = await db.select().from(payments);
    const allTenants = await db.select().from(tenants);
    const allRooms = await db.select().from(rooms);
    const debts = await computeDebts();
    const period = currentPeriodMonth();

    // Group revenue by period month
    const byMonth = new Map<string, number>();
    for (const p of allPayments) {
      const key =
        p.periodMonth ||
        (p.paymentDate ? String(p.paymentDate).slice(0, 7) : "unknown");
      byMonth.set(key, (byMonth.get(key) || 0) + (p.amount || 0));
    }
    const monthly = [...byMonth.entries()]
      .filter(([k]) => k !== "unknown")
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12)
      .map(([month, total]) => ({ month, total }));

    // Method breakdown
    const byMethod = new Map<string, number>();
    for (const p of allPayments) {
      const m = p.method || "other";
      byMethod.set(m, (byMethod.get(m) || 0) + (p.amount || 0));
    }

    const active = allTenants.filter((t) => t.status === "active");
    const potential = active.reduce((s, t) => s + (t.monthlyRent || 0), 0);
    const thisMonth = allPayments
      .filter((p) => {
        if (p.periodMonth === period) return true;
        return p.paymentDate && String(p.paymentDate).slice(0, 7) === period;
      })
      .reduce((s, p) => s + (p.amount || 0), 0);

    return NextResponse.json({
      period,
      rooms: allRooms.length,
      activeTenants: active.length,
      potentialMonthlyRent: potential,
      collectedThisMonth: thisMonth,
      totalDebt: debts.reduce((s, d) => s + d.balance, 0),
      monthly,
      methods: [...byMethod.entries()].map(([method, total]) => ({
        method,
        total,
      })),
      debts: debts.filter((d) => d.balance > 0),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa" }, { status: 500 });
  }
}
