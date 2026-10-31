# ASTRA 2026 — pure HTML/CSS/JS + Vercel Functions + Neon

Static site in `public/`, one small serverless API in `api/` (plain JavaScript), Neon PostgreSQL for data.
No React, Next.js, TypeScript or build step.

## 1. Neon setup (once)
1. Create a Neon project (a **new branch/database is recommended**; the schema only adds, never drops).
2. Neon console -> **SQL Editor** -> paste all of `db/schema.sql` -> Run. (Safe to re-run.)
3. Copy the connection string (Dashboard -> Connect, "pooled connection").

### Existing database with registrations? (no data loss)
1. Run `db/schema.sql` again (additive, safe) - adds the per-participant fee column and payment tables if missing.
2. Run `db/migrate-events-2026.sql` - renames/updates events IN PLACE (same ids, so registrations stay attached), hides events that were dropped (never deletes), adds new ones. Re-runnable.
3. Check the two result queries at the bottom of that file: 10 category rows, and an empty second list.
A fresh database only needs `db/schema.sql` + `npm run seed` (or paste `db/seed-events.sql`).

## 2. Run locally (Windows, Node 20.6+)
```powershell
cd path\to\astra
npm install
copy .env.example .env.local
notepad .env.local          # paste DATABASE_URL, and set AUTH_SECRET (see below)
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"   # use this output as AUTH_SECRET
npm test                    # logic tests (no database needed)
npm run seed                # inserts the 50 ASTRA 2026 events (safe to re-run)
npm run create-admin        # prompts for admin email + password (no default password exists)
npm run dev                 # http://localhost:3000
```

## 3. Flow to try
1. `/cl-register.html` - college registers its Leader (status: pending).
2. `/admin.html` - sign in -> **College Leaders** -> Approve.
3. `/cl-login.html` -> dashboard shows the **college code** and **registration link**.
4. Student opens the link (`/register.html?code=XXXXXXXX`) or types the code -> picks event -> submits.
5. Registration appears on the CL dashboard (only that college) and in Admin -> Registrations.
Event pages: every "Register Now" button and the list at the bottom of `/event.html` open `/register.html?event=<id>`.

## 4. Deploy (GitHub + Vercel)
```powershell
git status                                   # resolve/complete any unfinished merge first
git checkout -b live-migration
git add . ; git commit -m "Migrate to HTML/CSS/JS + Neon API; college leader registration"
git push -u origin live-migration            # never force-push
```
Vercel -> Add New Project -> import the repo -> Framework "Other" (no build command; `vercel.json` sets output to `public`).
Settings -> Environment Variables (Production + Preview): `DATABASE_URL`, `AUTH_SECRET`. Deploy the preview, test the flow above on the preview URL, then promote/merge to production.
Run `db/schema.sql`, `npm run seed` and `npm run create-admin` against the **same** Neon database the deployment uses.

## 5. Payments (Razorpay) - the College Leader pays, students never do
1. Razorpay Dashboard -> **Test mode** -> Settings -> API Keys -> generate key. Put `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env.local` and in Vercel.
2. Dashboard -> Settings -> Webhooks -> add `https://YOUR-SITE/api/razorpay/webhook`, active events `payment.captured` and `order.paid`, choose a secret, and set it as `RAZORPAY_WEBHOOK_SECRET`. (Webhooks only work on the deployed URL, not on localhost.)
3. Set a fee: Admin -> Events -> edit -> **Fee (₹)**. Events with fee 0 need no payment.
4. Flow: students register (payment shows "pending", with a note that their CL pays) -> CL dashboard -> **Payments** -> tick registrations -> **Pay now** -> Razorpay window -> on success the server verifies the signature and marks those registrations `paid` and `confirmed`. The webhook is a safety net if the browser closes early.
5. The amount is always computed on the server from event fees; the browser only sends which registrations. A CL can only pay for registrations of their own college. Replays are harmless (idempotent).
6. Go live only after a full test-mode payment works end to end; then switch to live keys.

## 6. Admin tasks
* **Revoke** a College Leader: they can no longer sign in, the college code stops accepting new student registrations, existing registrations are kept, and the college slot is freed. **Reinstate** reverses it (blocked if another Leader has taken the college).
* **Reset password**: generates a one-time temporary password (shown once; only its hash is stored). Passwords are never stored in readable form.
* Event fee: Admin -> Events -> Fee, tick "per participant" when the fee is charged per person (the CL payment total then multiplies by the number of non-substitute participants).

## 7. Security notes
* `DATABASE_URL`/`AUTH_SECRET` are server-side only. `.env*` is git-ignored. **Rotate any credentials that were ever in the old ZIP's `.env`.**
* The college of a student is derived on the server from the college code; any `college_id` sent by a browser is ignored, no endpoint updates it, and a DB trigger forbids changing it.
* One pending/approved CL per college is enforced by a partial unique index. CL data endpoints use the college from the signed session, never from the request.
* Passwords: scrypt. Sessions: signed HttpOnly SameSite=Strict cookies, re-checked against the DB on every request. Login/signup throttled in the DB. Origin check on state-changing requests.

* Home hero animation: `public/videos/astra-intro.mp4` / `.webm` (the Mumbai metro to ASTRA skyline video) plays as you scroll on the home page. Replace those two files (keep the names) to change it; encode with a keyframe every 4 frames so scrubbing stays smooth.

## 8. Known limits
* Capacity/waitlist check is not race-proof under heavy simultaneous load.
* If a CL closes the payment window, the same registrations are locked for 10 minutes before a new payment can start (prevents double payment).
* A student "account" is a participant record per registration (no student login), matching the original site.
* `contact.html` form (`formEndpoint: ''`) and the `/departments`, `/schedule` links are not wired - they were unfinished in the original.
* `public/contactimage/person.png` and `contactbg.png` are placeholders (the originals were missing from the project) - replace them with the real team photos / background, same file names.
* `public/Gammingpage.zip` and `ASTRAPRO.zip` are served publicly; remove them from `public/` if they should not be.
* Original HTML hashes: `db/original-html-sha256.txt`. Files edited on purpose (links/registration wiring only): index (home page links), event, performingarts, literary_arts, fine_arts, tech-arts, fun_n_games, informal_event, gaming, sport. `public/html/register.html` is untouched; the live form is the new `public/register.html`.
