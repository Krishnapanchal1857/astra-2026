// Inserts the ASTRA 2026 events from data/events-2026.json. Safe to re-run: existing events (same name) are left untouched.
// For an existing database that already has registrations, run db/migrate-events-2026.sql instead (it updates events in place).
import { readFileSync } from "node:fs";
import { q } from "../lib/db.js";

const events = JSON.parse(readFileSync(new URL("../data/events-2026.json", import.meta.url), "utf8"));
const XF = {
  cat: { Gaming: [{ key: "ingame_username", label: "In-game username", type: "text", required: true }],
         "Tech Arts": [{ key: "portfolio_url", label: "Portfolio / submission URL", type: "url", required: false }] },
  sub: { Drama: [{ key: "synopsis", label: "Performance title & short synopsis", type: "textarea", required: true }] },
};
let added = 0;
for (const e of events) {
  const fields = XF.sub[e.subcategory] || XF.cat[e.category] || [];
  const rows = await q(
    `INSERT INTO events (name, category, subcategory, description, allow_individual, allow_team, min_team_size, max_team_size,
       max_substitutes, fee_paise, fee_per_person, registration_status, extra_fields)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb) ON CONFLICT (name) DO NOTHING RETURNING id`,
    [e.name, e.category, e.subcategory, e.description, e.allow_individual, e.allow_team, e.min, e.max, e.subs,
     e.fee * 100, e.fee_per_person, e.open ? "open" : "closed", JSON.stringify(fields)]);
  added += rows.length;
}
const [{ n }] = await q("SELECT count(*)::int AS n FROM events WHERE is_active");
console.log(`Seed finished: ${added} new event(s) inserted, ${n} active events in database.`);
