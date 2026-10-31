import { HttpError } from "./http.js";
import { text } from "./validate.js";

export const CATEGORY_ORDER = ["Performing Arts", "Literary Arts", "Fine Arts", "Tech Arts", "Sports", "Gaming", "Fun & Games", "Informal Events", "Public Relations"];

export function isOpen(r, now = new Date()) {
  return !!r.is_active && r.registration_status === "open" && r.min_team_size != null && r.max_team_size != null &&
    (!r.registration_opens_at || new Date(r.registration_opens_at) <= now) &&
    (!r.registration_closes_at || new Date(r.registration_closes_at) >= now);
}

export function toPublic(r) {
  const formats = [];
  if (r.allow_individual) formats.push("individual");
  if (r.allow_team) formats.push("team");
  const ci = CATEGORY_ORDER.indexOf(r.category);
  return {
    id: r.id, name: r.name, category: r.category, cat_sort: ci < 0 ? 99 : ci, subcategory: r.subcategory || "",
    description: r.description || "", formats, min_size: r.min_team_size, max_size: r.max_team_size,
    sub_max: r.max_substitutes || 0, registration_open: isOpen(r), fee: Math.round((r.fee_paise || 0) / 100), fee_per_person: !!r.fee_per_person,
    extra_fields: Array.isArray(r.extra_fields) ? r.extra_fields : [],
  };
}

// Team-size rules (mirrors the original registration page).
export function bounds(ev, fmt) {
  if (fmt === "individual") return [1, 1];
  const lo = ev.allow_individual ? Math.max(2, ev.min_team_size || 2) : ev.min_team_size;
  return [lo, ev.max_team_size];
}

export function parseEventInput(b) {
  const name = text(b.name, 150), category = text(b.category, 60);
  if (!name || !category) throw new HttpError(400, "Name and category are required.");
  const int = (v, label, min = 0, max = 1000) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${label} is invalid.`);
    return n;
  };
  const allow_individual = b.allow_individual !== false && b.allow_individual !== "false";
  const allow_team = b.allow_team === true || b.allow_team === "true";
  if (!allow_individual && !allow_team) throw new HttpError(400, "Allow individual, team, or both.");
  const min_team_size = int(b.min_team_size, "Minimum size", 1, 100), max_team_size = int(b.max_team_size, "Maximum size", 1, 100);
  if (min_team_size != null && max_team_size != null && min_team_size > max_team_size) throw new HttpError(400, "Minimum size exceeds maximum.");
  const status = ["open", "closed"].includes(b.registration_status) ? b.registration_status : "open";
  const rupees = int(b.fee, "Fee", 0, 100000) || 0;
  let extra = b.extra_fields ?? [];
  if (typeof extra === "string") { try { extra = JSON.parse(extra || "[]"); } catch { throw new HttpError(400, "Extra fields must be valid JSON."); } }
  if (!Array.isArray(extra) || extra.length > 10) throw new HttpError(400, "Extra fields are invalid.");
  extra = extra.map((f) => ({
    key: text(f.key, 40).replace(/[^a-z0-9_]/gi, "_"), label: text(f.label, 80),
    type: ["text", "url", "textarea"].includes(f.type) ? f.type : "text", required: !!f.required,
  })).filter((f) => f.key && f.label);
  const date = (v) => { if (!v) return null; const d = new Date(v); if (isNaN(d)) throw new HttpError(400, "Invalid date."); return d.toISOString(); };
  return {
    name, category, subcategory: text(b.subcategory, 60), description: text(b.description, 2000), allow_individual, allow_team,
    min_team_size, max_team_size, max_substitutes: int(b.max_substitutes, "Substitutes", 0, 20) || 0, fee_paise: rupees * 100,
    capacity: int(b.capacity, "Capacity", 1, 100000), registration_opens_at: date(b.registration_opens_at),
    registration_closes_at: date(b.registration_closes_at), registration_status: status, fee_per_person: b.fee_per_person === true || b.fee_per_person === "true", extra_fields: extra, is_active: b.is_active !== false,
  };
}
