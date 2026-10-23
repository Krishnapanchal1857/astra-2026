import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { isAdmin } from "@/lib/auth";
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const e = await req.json(); const id = Number(params.id);
  const [row] = await sql`UPDATE events SET no=${e.no},name=${e.name},category=${e.category},subcategory=${e.subcategory || null},description=${e.description || ""},
    team_size=${e.team_size || ""},duration=${e.duration || ""},format=${e.format || ""},components=${e.components || ""},mumbai_angle=${e.mumbai_angle || ""},
    flagship=${!!e.flagship},event_date=${e.event_date || null},venue=${e.venue || null},fee=${Number(e.fee) || 0},is_open=${e.is_open !== false} WHERE id=${id} RETURNING *`;
  return row ? NextResponse.json(row) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await sql`DELETE FROM events WHERE id=${Number(params.id)}`;
  return NextResponse.json({ ok: true });
}
