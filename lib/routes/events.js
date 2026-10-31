import { q } from "../db.js";
import { HttpError } from "../http.js";
import { requireAdmin } from "../auth.js";
import { toPublic, parseEventInput } from "../events.js";
import { isUniqueViolation } from "../validate.js";

export async function list() {
  const rows = await q("SELECT * FROM events WHERE is_active ORDER BY id");
  return { events: rows.map(toPublic) };
}

const COLS = ["name","category","subcategory","description","allow_individual","allow_team","min_team_size","max_team_size","max_substitutes","fee_paise","fee_per_person","capacity","registration_opens_at","registration_closes_at","registration_status","extra_fields","is_active"];

export async function adminList({ req }) {
  await requireAdmin(req);
  const rows = await q(`SELECT e.*, (SELECT count(*)::int FROM registrations r WHERE r.event_id=e.id) AS reg_count FROM events e ORDER BY e.id`);
  return { events: rows };
}

export async function create({ req, body }) {
  await requireAdmin(req);
  const e = parseEventInput(body);
  try {
    const [row] = await q(
      `INSERT INTO events (${COLS.join(",")}) VALUES (${COLS.map((_, i) => `$${i + 1}${COLS[i] === "extra_fields" ? "::jsonb" : ""}`).join(",")}) RETURNING id`,
      COLS.map((c) => (c === "extra_fields" ? JSON.stringify(e[c]) : e[c])));
    return { status: 201, body: { id: row.id } };
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, "An event with this name already exists.");
    throw err;
  }
}

export async function update({ req, body, params }) {
  await requireAdmin(req);
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, "Bad event id.");
  const e = parseEventInput(body);
  const sets = COLS.map((c, i) => `${c}=$${i + 2}${c === "extra_fields" ? "::jsonb" : ""}`).join(",");
  try {
    const rows = await q(`UPDATE events SET ${sets}, updated_at=now() WHERE id=$1 RETURNING id`,
      [id, ...COLS.map((c) => (c === "extra_fields" ? JSON.stringify(e[c]) : e[c]))]);
    if (!rows.length) throw new HttpError(404, "Event not found.");
    return { ok: true };
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, "An event with this name already exists.");
    throw err;
  }
}

// Never cascades: an event that already has registrations can only be deactivated.
export async function remove({ req, params }) {
  await requireAdmin(req);
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw new HttpError(400, "Bad event id.");
  const [{ n }] = await q("SELECT count(*)::int AS n FROM registrations WHERE event_id=$1", [id]);
  if (n > 0) throw new HttpError(409, `This event has ${n} registration(s). Deactivate it instead of deleting.`);
  const rows = await q("DELETE FROM events WHERE id=$1 RETURNING id", [id]);
  if (!rows.length) throw new HttpError(404, "Event not found.");
  return { ok: true };
}
