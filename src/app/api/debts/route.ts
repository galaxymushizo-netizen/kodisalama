import { NextResponse } from "next/server";
import { computeDebts } from "@/lib/debts";
import { getSessionUserId } from "@/lib/auth";
import { unauthorized } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return unauthorized();

  try {
    const debts = await computeDebts(userId);
    const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
    const sorted = [...debts].sort((a, b) => b.balance - a.balance);
    return NextResponse.json({ debts: sorted, totalDebt });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kuhesabu madeni" }, { status: 500 });
  }
}
