import { q, tx } from "../db.js";
import { HttpError } from "../http.js";
import { randomInt } from "node:crypto";
import { verifyPassword, hashPassword, issueSession, clearSession, requireAdmin, rateLimit } from "../auth.js";
import { isUniqueViolation } from "../validate.js";

export async function login({ req, res, body }) {
  const e = String(body.email || "").trim().toLowerCase().slice(0, 255);
  await rateLimit(req, "admin-login", 8, 900, e);
  const [a] = await q("SELECT id, password_hash FROM admin_users WHERE lower(email)=$1 AND active", [e]);
  const ok = await verifyPassword(String(body.password || ""), a?.password_hash);
  if (!a || !ok) throw new HttpError(401, "Incorrect email or password.");
  await q("UPDATE admin_users SET last_login_at=now() WHERE id=$1", [a.id]);
  await issueSession(res, "admin", { sub: a.id });
  return { ok: true };
}
export async function logout({ res }) { clearSession(res, "admin"); return { ok: true }; }
export async function me({ req }) { const a = await requireAdmin(req); return { admin: { email: a.email } }; }

export async function listCL({ req, query }) {
  await requireAdmin(req);
  const status = ["pending", "approved", "rejected", "revoked"].includes(query.status) ? query.status : null;
  const rows = await q(
    `SELECT l.id, l.full_name, l.email, l.mobile, l.department, l.course_year, l.status, l.created_at, l.approved_at,
            c.name AS college_name, c.join_code, c.status AS college_status,
            (SELECT count(*)::int FROM registrations r WHERE r.college_id=c.id) AS registrations
       FROM college_leaders l JOIN colleges c ON c.id=l.college_id
      WHERE ($1::text IS NULL OR l.status=$1) ORDER BY l.created_at DESC LIMIT 500`, [status]);
  return { leaders: rows };
}

const NEXT = { approve: ["approved", "active", "pending"], reject: ["rejected", "pending", "pending"], revoke: ["revoked", "disabled", "approved"], reinstate: ["approved", "active", "revoked"] };

// One-time temporary password (never stored in readable form; only its hash is saved).
function tempPassword() {
  const L = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz", D = "23456789", A = L + D;
  const c = [L[randomInt(L.length)], D[randomInt(D.length)]];
  while (c.length < 12) c.push(A[randomInt(A.length)]);
  for (let i = c.length - 1; i > 0; i--) { const j = randomInt(i + 1); [c[i], c[j]] = [c[j], c[i]]; }
  return c.join("");
}
export async function decideCL({ req, params }) {
  const admin = await requireAdmin(req);
  if (params.action === "reset-password") {
    const [c] = await q("SELECT id, status FROM college_leaders WHERE id=$1", [params.id]).catch(() => []);
    if (!c) throw new HttpError(404, "College Leader not found.");
    if (c.status !== "approved") throw new HttpError(409, "Only approved College Leaders can have their password reset.");
    const temp = tempPassword();
    await q("UPDATE college_leaders SET password_hash=$2 WHERE id=$1", [c.id, await hashPassword(temp)]);
    return { ok: true, temporary_password: temp };   // shown once to the admin; not stored anywhere
  }
  const spec = NEXT[params.action];
  if (!spec) throw new HttpError(404, "Unknown action.");
  const [leaderStatus, collegeStatus, from] = spec;
  const [l] = await q("SELECT id, college_id, status FROM college_leaders WHERE id=$1", [params.id]).catch(() => []);
  if (!l) throw new HttpError(404, "College Leader not found.");
  if (l.status !== from) throw new HttpError(409, `Only ${from} accounts can be ${leaderStatus}.`);
  try { await tx((t) => [
    t(`UPDATE college_leaders SET status=$2, approved_by=CASE WHEN $2='approved' THEN $3::uuid ELSE approved_by END,
              approved_at=CASE WHEN $2='approved' THEN now() ELSE approved_at END WHERE id=$1 AND status=$4`,
      [l.id, leaderStatus, admin.id, from]),
    t("UPDATE colleges SET status=$2 WHERE id=$1", [l.college_id, collegeStatus]),
  ]); } catch (e) {
    if (isUniqueViolation(e)) throw new HttpError(409, "Another College Leader already holds this college.");
    throw e;
  }
  return { ok: true, status: leaderStatus };
}

export async function registrations({ req, query }) {
  await requireAdmin(req);
  const ev = Number(query.event_id);
  const rows = await q(
    `SELECT r.id, r.reg_code, r.format, r.team_name, r.college_name, r.status, r.payment_status, r.contact_email, r.contact_phone, r.created_at,
            e.name AS event_name, (SELECT count(*)::int FROM participants p WHERE p.registration_id=r.id) AS people
       FROM registrations r JOIN events e ON e.id=r.event_id
      WHERE ($1::int IS NULL OR r.event_id=$1) ORDER BY r.created_at DESC LIMIT 1000`, [Number.isInteger(ev) ? ev : null]);
  return { registrations: rows };
}

export async function setRegistrationStatus({ req, body, params }) {
  await requireAdmin(req);
  const status = ["pending", "confirmed", "waitlisted", "cancelled"].includes(body.status) ? body.status : null;
  if (!status) throw new HttpError(400, "Invalid status.");
  const [r] = await q("SELECT id FROM registrations WHERE id=$1", [params.id]).catch(() => []);
  if (!r) throw new HttpError(404, "Registration not found.");
  await tx((t) => [
    t("UPDATE registrations SET status=$2, updated_at=now() WHERE id=$1", [r.id, status]),
    t("UPDATE participants SET active=$2 WHERE registration_id=$1", [r.id, status !== "cancelled"]),
  ]);
  return { ok: true };
}
