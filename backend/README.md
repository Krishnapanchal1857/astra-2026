# ASTRA 2026 · Event registration site

Next.js 14 + Tailwind + TypeScript + Neon Postgres. Fully responsive (side rail on desktop, bottom tabs on mobile).

## Setup
1. Create a project at https://console.neon.tech and copy the connection string.
2. `cp .env.example .env.local` and fill in `DATABASE_URL`, `ADMIN_PASSWORD`, `AUTH_SECRET`.
3. `npm install`
4. `npm run seed` (creates the tables and loads all 52 events from `data/events.json`; safe to re-run)
5. `npm run dev` then open http://localhost:3000

## Pages
- `/` parallax landing page, flagship events
- `/events` filter by category and search; `/events/[id]` details and registration form
- `/admin` sign in with `ADMIN_PASSWORD` to add, edit, delete events, close registrations and view registrations

## Deploy
Push to GitHub, import into Vercel and add the three environment variables.
