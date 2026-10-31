import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { SignJWT, jwtVerify } from "jose";
import { q } from "./db.js";
import { HttpError, parseCookies, cookieHeader, clientIp } from "./http.js";

const scryptAsync = promisify(scrypt);
const N = 16384, R = 8, P = 1, KEYLEN = 64;

// ---- passwords (scrypt, salted) ----
export async function hashPassword(pw) {
  const salt = randomBytes(16);
  const key = await scryptAsync(pw, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

let DUMMY = null;
export async function verifyPassword(pw, stored) {
  // Always do the same amount of work so unknown users aren't distinguishable by timing.
  if (!stored) { DUMMY ||= await hashPassword("dummy-password-1"); stored = DUMMY; await verifyInner(pw, stored); return false; }
  return verifyInner(pw, stored);
}
async function verifyInner(pw, stored) {
  const [alg, n, r, p, saltB64, hashB64] = String(stored).split("$");
  if (alg !== "scrypt") return false;
  const expected = Buffer.from(hashB64, "base64");
  const key = await scryptAsync(String(pw), Buffer.from(saltB64, "base64"), expected.length, { N: +n, r: +r, p: +p });
  return timingSafeEqual(key, expected);
}

// ---- signed session cookies ----
const secret = () => {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to a random string of at least 32 characters");
  return new TextEncoder().encode(s);
};
const HOURS = 12;
export const COOKIES = { admin: "astra_admin", cl: "astra_cl" };

export async function issueSession(res, kind, claims) {
  const token = await new SignJWT({ ...claims, kind })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${HOURS}h`)
    .sign(secret());
  appendCookie(res, cookieHeader(COOKIES[kind], token, HOURS * 3600));
}
export function clearSession(res, kind) { appendCookie(res, cookieHeader(COOKIES[kind], "", 0)); }
function appendCookie(res, value) {
  const prev = res.getHeader("Set-Cookie");
  res.setHeader("Set-Cookie", prev ? [].concat(prev, value) : value);
}

async function readSession(req, kind) {
  const t = parseCookies(req)[COOKIES[kind]];
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, secret(), { algorithms: ["HS256"] });
    return payload.kind === kind ? payload : null;
  } catch { return null; }
}

// Authorization is always re-checked against the database, never trusted from the browser.
export async function requireAdmin(req) {
  const s = await readSession(req, "admin");
  if (!s) throw new HttpError(401, "Admin sign-in required.");
  const [a] = await q("SELECT id, email, role FROM admin_users WHERE id=$1 AND active", [s.sub]);
  if (!a) throw new HttpError(401, "Admin sign-in required.");
  return a;
}

export async function requireCL(req) {
  const s = await readSession(req, "cl");
  if (!s) throw new HttpError(401, "Sign in as a College Leader.");
  const [l] = await q(
    `SELECT l.id, l.full_name, l.email, l.college_id, c.name AS college_name, c.join_code
       FROM college_leaders l JOIN colleges c ON c.id = l.college_id
      WHERE l.id=$1 AND l.status='approved' AND c.status='active'`, [s.sub]);
  if (!l) throw new HttpError(401, "Your College Leader account is not active.");
  return l;
}

// ---- throttling (stored in the database so it works across serverless instances) ----
export async function rateLimit(req, bucket, max, windowSec, extra = "") {
  const key = `${bucket}:${clientIp(req)}${extra ? ":" + extra : ""}`.slice(0, 200);
  const [{ n }] = await q(
    "SELECT count(*)::int AS n FROM auth_attempts WHERE key=$1 AND attempted_at > now() - make_interval(secs => $2)",
    [key, windowSec]);
  if (n >= max) throw new HttpError(429, "Too many attempts. Please wait a few minutes and try again.");
  await q("INSERT INTO auth_attempts (key) VALUES ($1)", [key]);
  if (Math.random() < 0.02) await q("DELETE FROM auth_attempts WHERE attempted_at < now() - interval '1 day'");
}
