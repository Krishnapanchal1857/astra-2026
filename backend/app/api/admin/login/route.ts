import { NextResponse } from "next/server";
import { signAdmin } from "@/lib/auth";
export async function POST(req: Request) {
  const { password } = await req.json();
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set("astra_admin", await signAdmin(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 43200, path: "/" });
  return res;
}
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("astra_admin");
  return res;
}
export async function GET() {
  const { isAdmin } = await import("@/lib/auth");
  return NextResponse.json({ admin: await isAdmin() });
}
