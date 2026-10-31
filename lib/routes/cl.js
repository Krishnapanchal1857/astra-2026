import { randomUUID } from "node:crypto";
import { q, tx } from "../db.js";
import { HttpError } from "../http.js";
import { hashPassword, verifyPassword, issueSession, clearSession, requireCL, rateLimit } from "../auth.js";
import * as v from "../validate.js";

export async function register({ req, body }) {
  await rateLimit(req, "cl-register", 5, 3600);
  const college_name = v.req(body.college_name, "College name", 150, 3);
  const full_name = v.req(body.full_name, "Full name", 100, 2);
  const emailV = v.email(body.email);
  const mobileV = v.mobile(body.mobile);
  const department = v.req(body.department, "Department / course", 100);
  const course_year = v.year(body.course_year);
  const pw = v.password(body.password);
  if (body.consent !== true) throw new HttpError(400, "Please accept the consent statement.");

  const key = v.collegeKey(college_name);
  if (key.length < 3) throw new HttpError(400, "Enter the full college name.");

  // One active (pending/approved) CL per college.
  const [taken] = await q(
    `SELECT 1 FROM colleges c JOIN college_leaders l ON l.college_id=c.id
      WHERE c.name_key=$1 AND l.status IN ('pending','approved') LIMIT 1`, [key]);
  if (taken) throw new HttpError(409, "This college already has a College Leader (pending or approved). Please contact the ASTRA committee.");

  const [dup] = await q("SELECT 1 FROM college_leaders WHERE lower(email)=$1 OR mobile=$2 LIMIT 1", [emailV, mobileV]);
  if (dup) throw new HttpError(409, "An account with this email or mobile number already exists.");

  const hash = await hashPassword(pw);
  try {
    await tx((t) => [
      t(`INSERT INTO colleges (id, name, name_key, join_code) VALUES ($1,$2,$3,$4) ON CONFLICT (name_key) DO NOTHING`,
        [randomUUID(), college_name, key, v.genCode(8)]),
      t(`INSERT INTO college_leaders (college_id, full_name, email, mobile, department, course_year, password_hash)
         SELECT id, $2, $3, $4, $5, $6, $7 FROM colleges WHERE name_key=$1`,
        [key, full_name, emailV, mobileV, department, course_year, hash]),
    ]);
  } catch (e) {
    if (v.isUniqueViolation(e)) {
      const w = v.violated(e);
      if (/one_active/.test(w)) throw new HttpError(409, "This college already has a College Leader (pending or approved).");
      throw new HttpError(409, "An account with this email or mobile number already exists.");
    }
    throw e;
  }
  return { status: 201, body: { ok: true, status: "pending", message: "Registered. An ASTRA administrator must approve your account before you can sign in." } };
}

export async function login({ req, res, body }) {
  const e = String(body.email || "").trim().toLowerCase().slice(0, 255);
  await rateLimit(req, "cl-login", 10, 900, e);
  const [l] = await q(
    `SELECT l.id, l.password_hash, l.status, c.status AS college_status
       FROM college_leaders l JOIN colleges c ON c.id=l.college_id WHERE lower(l.email)=$1`, [e]);
  const ok = await verifyPassword(String(body.password || ""), l?.password_hash);
  if (!l || !ok) throw new HttpError(401, "Incorrect email or password.");
  if (l.status === "pending") throw new HttpError(403, "Your account is awaiting administrator approval.");
  if (l.status !== "approved" || l.college_status !== "active") throw new HttpError(403, "This account is not active. Contact the ASTRA committee.");
  await q("UPDATE college_leaders SET last_login_at=now() WHERE id=$1", [l.id]);
  await issueSession(res, "cl", { sub: l.id });
  return { ok: true };
}

export async function logout({ res }) { clearSession(res, "cl"); return { ok: true }; }

export async function me({ req }) {
  const l = await requireCL(req);
  return { leader: { name: l.full_name, email: l.email }, college: { name: l.college_name, code: l.join_code } };
}

// Every query below is scoped to the college_id from the verified session, never from the request.
async function loadRegs(collegeId) {
  const regs = await q(
    `SELECT r.id, r.reg_code, r.format, r.team_name, r.status, r.payment_status, r.created_at, e.name AS event_name, e.category, e.fee_paise * CASE WHEN e.fee_per_person THEN (SELECT count(*)::int FROM participants p WHERE p.registration_id=r.id AND p.role<>'substitute') ELSE 1 END AS fee_paise
       FROM registrations r JOIN events e ON e.id=r.event_id
      WHERE r.college_id=$1 ORDER BY r.created_at DESC LIMIT 1000`, [collegeId]);
  const ids = regs.map((r) => r.id);
  const people = ids.length
    ? await q(`SELECT registration_id, full_name, email, mobile, department, course_year, roll_number, role
                 FROM participants WHERE college_id=$1 AND registration_id = ANY($2::uuid[]) ORDER BY created_at`, [collegeId, ids])
    : [];
  for (const r of regs) r.participants = people.filter((p) => p.registration_id === r.id).map(({ registration_id, ...p }) => p);
  return regs;
}

export async function dashboard({ req }) {
  const l = await requireCL(req);
  const regs = await loadRegs(l.college_id);
  const students = new Set();
  regs.forEach((r) => r.participants.forEach((p) => students.add(p.roll_number.toLowerCase())));
  return {
    college: { name: l.college_name, code: l.join_code }, leader: { name: l.full_name },
    stats: { registrations: regs.length, students: students.size }, registrations: regs,
  };
}

const csvCell = (s) => {
  let t = String(s ?? "");
  if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;           // neutralise spreadsheet formulas
  return `"${t.replace(/"/g, '""')}"`;
};
export async function exportCsv({ req }) {
  const l = await requireCL(req);
  const regs = await loadRegs(l.college_id);
  const rows = [["Reg code", "Event", "Format", "Team", "Status", "Payment", "Name", "Role", "Roll no", "Department", "Year", "Email", "Mobile"]];
  for (const r of regs) for (const p of r.participants)
    rows.push([r.reg_code, r.event_name, r.format, r.team_name || "", r.status, r.payment_status, p.full_name, p.role, p.roll_number, p.department, p.course_year, p.email || "", p.mobile || ""]);
  return { raw: rows.map((r) => r.map(csvCell).join(",")).join("\r\n"), type: "text/csv; charset=utf-8", filename: "astra-students.csv" };
}

export async function changePassword({ req, body }) {
  const l = await requireCL(req);
  await rateLimit(req, "cl-pw", 8, 900, l.id);
  const [row] = await q("SELECT password_hash FROM college_leaders WHERE id=$1", [l.id]);
  if (!(await verifyPassword(String(body.current_password || ""), row?.password_hash))) throw new HttpError(401, "Current password is incorrect.");
  const next = v.password(body.new_password);
  await q("UPDATE college_leaders SET password_hash=$2 WHERE id=$1", [l.id, await hashPassword(next)]);
  return { ok: true };
}
