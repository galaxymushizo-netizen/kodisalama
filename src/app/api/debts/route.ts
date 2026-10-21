import { NextResponse } from "next/server";
import { computeDebts } from "@/lib/debts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const debts = await computeDebts();
    const totalDebt = debts.reduce((s, d) => s + d.balance, 0);
    const sorted = [...debts].sort((a, b) => b.balance - a.balance);
    return NextResponse.json({ debts: sorted, totalDebt });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Imeshindwa kuhesabu madeni" }, { status: 500 });
  }
}
