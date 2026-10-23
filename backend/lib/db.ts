import { neon } from "@neondatabase/serverless";
// Created on first use so the site still loads (with no events) before DATABASE_URL is set.
export const sql = (strings: TemplateStringsArray, ...values: any[]): Promise<any[]> => {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.local");
  return neon(url)(strings, ...values) as Promise<any[]>;
};
export type EventRow = {
  id: number; no: number; name: string; category: string; subcategory: string | null;
  description: string; team_size: string; duration: string; format: string; components: string;
  mumbai_angle: string; flagship: boolean; event_date: string | null; venue: string | null;
  fee: number; is_open: boolean;
};
export async function getEvents(): Promise<EventRow[]> {
  try { return (await sql`SELECT * FROM events ORDER BY no`) as EventRow[]; } catch { return []; }
}
export async function getEvent(id: number): Promise<EventRow | null> {
  try { return ((await sql`SELECT * FROM events WHERE id = ${id}`) as EventRow[])[0] ?? null; } catch { return null; }
}
