import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSessionUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Returns the signed-in user's basic profile (id, fullName, email). */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Hitaji kuingia." }, { status: 401 });
  }
  const rows = await db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!rows[0]) {
    return NextResponse.json({ error: "Akaunti haipatikani." }, { status: 401 });
  }
  return NextResponse.json(rows[0]);
}
