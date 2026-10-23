import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
export async function POST(req: Request) {
  const b = await req.json();
  const need = ["event_id", "leader_name", "email", "phone", "college"];
  if (need.some((k) => !String(b[k] ?? "").trim())) return NextResponse.json({ error: "Please fill all required fields." }, { status: 400 });
  if (!/^\S+@\S+\.\S+$/.test(b.email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!/^[0-9+\-\s]{10,15}$/.test(b.phone)) return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
  const [ev] = await sql`SELECT is_open FROM events WHERE id=${Number(b.event_id)}`;
  if (!ev) return NextResponse.json({ error: "Event not found." }, { status: 404 });
  if (!ev.is_open) return NextResponse.json({ error: "Registrations for this event are closed." }, { status: 403 });
  await sql`INSERT INTO registrations (event_id,team_name,leader_name,email,phone,college,members)
    VALUES (${Number(b.event_id)},${b.team_name || null},${b.leader_name},${b.email},${b.phone},${b.college},${b.members || ""})`;
  return NextResponse.json({ ok: true }, { status: 201 });
}
