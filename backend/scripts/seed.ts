import { neon } from "@neondatabase/serverless";
import events from "../data/events.json";
const sql = neon(process.env.DATABASE_URL!);
async function main() {
  await sql`CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY, no INT UNIQUE NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL, subcategory TEXT,
    description TEXT DEFAULT '', team_size TEXT DEFAULT '', duration TEXT DEFAULT '', format TEXT DEFAULT '',
    components TEXT DEFAULT '', mumbai_angle TEXT DEFAULT '', flagship BOOLEAN DEFAULT FALSE,
    event_date TEXT, venue TEXT, fee INT DEFAULT 0, is_open BOOLEAN DEFAULT TRUE, created_at TIMESTAMPTZ DEFAULT now())`;
  await sql`CREATE TABLE IF NOT EXISTS registrations (
    id SERIAL PRIMARY KEY, event_id INT REFERENCES events(id) ON DELETE CASCADE, team_name TEXT, leader_name TEXT NOT NULL,
    email TEXT NOT NULL, phone TEXT NOT NULL, college TEXT NOT NULL, members TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT now())`;
  for (const e of events as any[]) {
    await sql`INSERT INTO events (no,name,category,subcategory,description,team_size,duration,format,components,mumbai_angle,flagship)
      VALUES (${e.no},${e.name},${e.category},${e.subcategory},${e.description},${e.team_size},${e.duration},${e.format},${e.components},${e.mumbai_angle},${e.flagship})
      ON CONFLICT (no) DO NOTHING`;
  }
  console.log(`Seeded ${events.length} events.`);
}
main();
