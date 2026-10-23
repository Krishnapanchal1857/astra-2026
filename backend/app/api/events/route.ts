import { NextResponse } from "next/server";
import { sql, getEvents } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json(await getEvents()); }
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const e = await req.json();
  if (!e.name || !e.category) return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
  const [row] = await sql`INSERT INTO events (no,name,category,subcategory,description,team_size,duration,format,components,mumbai_angle,flagship,event_date,venue,fee,is_open)
    VALUES (${e.no || (await sql`SELECT COALESCE(MAX(no),0)+1 AS n FROM events`)[0].n},${e.name},${e.category},${e.subcategory || null},${e.description || ""},${e.team_size || ""},${e.duration || ""},${e.format || ""},${e.components || ""},${e.mumbai_angle || ""},${!!e.flagship},${e.event_date || null},${e.venue || null},${Number(e.fee) || 0},${e.is_open !== false}) RETURNING *`;
  return NextResponse.json(row, { status: 201 });
}
