import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await sql`SELECT r.*, e.name AS event_name FROM registrations r JOIN events e ON e.id=r.event_id ORDER BY r.created_at DESC`);
}
