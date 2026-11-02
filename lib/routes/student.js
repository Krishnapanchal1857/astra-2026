import { randomUUID } from "node:crypto";
import { q, tx } from "../db.js";
import { HttpError } from "../http.js";
import { rateLimit } from "../auth.js";
import { bounds, isOpen } from "../events.js";
import * as v from "../validate.js";

async function collegeByCode(codeRaw) {
  const code = v.normCode(codeRaw);
  if (code.length < 6) throw new HttpError(400, "Enter a valid college code.");
  const [c] = await q("SELECT id, name, join_code FROM colleges WHERE join_code=$1 AND status='active'", [code]);
  if (!c) throw new HttpError(404, "College code not found or not active yet. Check with your College Leader.");
  return c;
}

export async function collegeLookup({ req, params }) {
  await rateLimit(req, "college-lookup", 40, 900);
  const c = await collegeByCode(params.code);
  return { college: { name: c.name } };
}

function person(p, i, role, needContact) {
  const L = role === "substitute" ? `Substitute ${i}` : i === 0 ? "Leader" : `Member ${i + 1}`;
  if (!p || typeof p !== "object") throw new HttpError(400, `${L}: details are required.`);
  const out = {
    full_name: v.req(p.full_name, `${L} full name`, 100, 2),
    department: v.req(p.department, `${L} department`, 100),
    course_year: (() => { try { return v.year(p.course_year); } catch { throw new HttpError(400, `${L}: select a course year.`); } })(),
    roll_number: v.roll(p.roll_number, `${L} roll number`),
    email: null, mobile: null, role,
  };
  if (needContact || String(p.email || "").trim()) out.email = v.email(p.email, `${L} email`);
  if (needContact || String(p.mobile || "").trim()) out.mobile = v.mobile(p.mobile, `${L} mobile number`);
  return out;
}

export async function register({ req, body }) {
  await rateLimit(req, "student-register", 20, 3600);
  const college = await collegeByCode(body.code);                 // college comes ONLY from the validated code
  const eventId = Number(body.event_id);
  if (!Number.isInteger(eventId)) throw new HttpError(400, "Choose an event.");
  const [ev] = await q("SELECT * FROM events WHERE id=$1", [eventId]);
  if (!ev || !ev.is_active) throw new HttpError(404, "Event not found.");
  if (!isOpen(ev)) throw new HttpError(409, "Registration for this event is not open.");

  const fmt = body.format === "team" ? "team" : body.format === "individual" ? "individual" : null;
  if (!fmt || (fmt === "team" && !ev.allow_team) || (fmt === "individual" && !ev.allow_individual))
    throw new HttpError(400, "This event does not accept that registration format.");

  const members = Array.isArray(body.members) ? body.members : [];
  const subs = Array.isArray(body.subs) ? body.subs : [];
  const [lo, hi] = bounds(ev, fmt);
  if (members.length < lo || members.length > hi)
    throw new HttpError(400, lo === hi ? `This event needs exactly ${lo} participant(s).` : `This event needs ${lo}-${hi} participants.`);
  if (fmt === "individual" ? subs.length : subs.length > (ev.max_substitutes || 0))
    throw new HttpError(400, `At most ${fmt === "individual" ? 0 : ev.max_substitutes || 0} substitute(s) allowed.`);

  const people = [
    ...members.map((m, i) => person(m, i, i === 0 ? "leader" : "member", i === 0)),
    ...subs.map((m, i) => person(m, i + 1, "substitute", false)),
  ];
  const rolls = people.map((p) => p.roll_number.toLowerCase());
  if (new Set(rolls).size !== rolls.length) throw new HttpError(400, "Each person needs a different roll number.");

  let team_name = null;
  if (fmt === "team") team_name = v.req(body.team_name, "Team name", 80, 2);

  const extra = {};
  const input = body.extra && typeof body.extra === "object" ? body.extra : {};
  for (const f of ev.extra_fields || []) {
    const val = v.text(input[f.key], 2000);
    if (f.required && !val) throw new HttpError(400, `${f.label} is required.`);
    if (val && f.type === "url" && !/^https?:\/\/[^\s]+$/i.test(val)) throw new HttpError(400, `${f.label} must be a valid http(s) link.`);
    if (val) extra[f.key] = val;
  }
  if (body.consent !== true) throw new HttpError(400, "Please accept the consent statement.");

  const idem = v.text(body.key, 80);
  if (idem && idem.length >= 8) {
    const [prev] = await q("SELECT reg_code, status, college_id FROM registrations WHERE idempotency_key=$1", [idem]);
    if (prev && prev.college_id === college.id) return { reg_code: prev.reg_code, status: prev.status, repeated: true };
  }

  // Duplicate rule: same roll number, same college, same event, while an active registration exists.
  const clash = await q(
    "SELECT roll_number FROM participants WHERE event_id=$1 AND college_id=$2 AND active AND lower(roll_number) = ANY($3::text[])",
    [ev.id, college.id, rolls]);
  if (clash.length) throw new HttpError(409, `Already registered for this event: roll no. ${clash.map((c) => c.roll_number).join(", ")}.`);

  let status = "pending";
  if (ev.capacity != null) {
    const [{ n }] = await q("SELECT count(*)::int AS n FROM registrations WHERE event_id=$1 AND status IN ('pending','confirmed')", [ev.id]);
    if (n >= ev.capacity) status = "waitlisted";
  }
  const payment_status = ev.fee_paise > 0 ? "pending" : "not_required";
  const leader = people[0];

  for (let attempt = 0; attempt < 3; attempt++) {
    const regId = randomUUID(), regCode = "AST-" + v.genCode(6);
    const vals = [], ph = people.map((p, i) => {
      const b = i * 10; vals.push(randomUUID(), regId, p.full_name, p.email, p.mobile, p.department, p.course_year, p.roll_number, p.role, college.id);
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9},$${b + 10},${ev.id})`;
    });
    try {
      await tx((t) => [
        t(`INSERT INTO registrations (id, reg_code, event_id, format, team_name, college_name, contingent_code, college_id,
             contact_email, contact_phone, extra, status, payment_status, consent, idempotency_key)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,true,$14)`,
          [regId, regCode, ev.id, fmt, team_name, college.name, college.join_code, college.id, leader.email, leader.mobile,
           JSON.stringify(extra), status, payment_status, idem.length >= 8 ? idem : null]),
        t(`INSERT INTO participants (id, registration_id, full_name, email, mobile, department, course_year, roll_number, role, college_id, event_id)
           VALUES ${ph.join(",")}`, vals),
      ]);
      return { status: 201, body: { reg_code: regCode, status, payment_status, event: ev.name, college: college.name } };
    } catch (e) {
      if (!v.isUniqueViolation(e)) throw e;
      const w = v.violated(e);
      if (/ux_participant_once_per_event/.test(w)) throw new HttpError(409, "One of these students is already registered for this event.");
      if (/idempotency/.test(w)) throw new HttpError(409, "This registration was already submitted.");
      if (!/reg_code/.test(w)) throw new HttpError(409, "Duplicate registration.");
    }
  }
  throw new HttpError(500, "Could not allocate a registration code. Please retry.");
}
