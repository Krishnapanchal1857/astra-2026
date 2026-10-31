import { requireAdmin, requireCL } from "../auth.js";

// Tells the website which button to show (Login / Logout). No data beyond role and display name.
export async function get({ req }) {
  try { const a = await requireAdmin(req); return { role: "admin", name: a.email }; } catch {}
  try { const l = await requireCL(req); return { role: "cl", name: l.full_name }; } catch {}
  return { role: null };
}
