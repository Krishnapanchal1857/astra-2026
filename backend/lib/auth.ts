import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret");
export async function signAdmin() {
  return new SignJWT({ role: "admin" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("12h").sign(key());
}
export async function isAdmin() {
  const t = cookies().get("astra_admin")?.value;
  if (!t) return false;
  try { await jwtVerify(t, key()); return true; } catch { return false; }
}
