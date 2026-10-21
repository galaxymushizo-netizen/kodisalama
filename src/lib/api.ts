import { NextResponse } from "next/server";

/** Standard 401 response for API routes when no valid session is present. */
export function unauthorized(): NextResponse {
  return NextResponse.json({ error: "Hitaji kuingia." }, { status: 401 });
}
