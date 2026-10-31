// Logic tests with an in-memory fake database (NO real SQL is executed here - see README "Not covered").
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-123456";
process.env.RAZORPAY_KEY_ID = "rzp_test_abc"; process.env.RAZORPAY_KEY_SECRET = "key_secret_xyz"; process.env.RAZORPAY_WEBHOOK_SECRET = "wh_secret_123";
import assert from "node:assert/strict";
import { db } from "../lib/db.js";
import { handle } from "../lib/router.js";
import { hashPassword, issueSession } from "../lib/auth.js";
import { createHmac } from "node:crypto";

const S = { calls: [], leaders: [], colleges: [], regs: [], parts: [], admins: [], paidCalls: [], seenEvents: new Set(), payable: [] };
const event = { id: 7, name: "Galli Theatre", category: "Performing Arts", subcategory: "Drama", allow_individual: false, allow_team: true,
  min_team_size: 5, max_team_size: 12, max_substitutes: 2, fee_paise: 0, capacity: null, is_active: true, registration_status: "open",
  extra_fields: [{ key: "synopsis", label: "Synopsis", type: "textarea", required: true }] };
const college = { id: "c1", name: "Test College", join_code: "ABCD2345", status: "active" };

db.query = async (text, p = []) => {
  S.calls.push({ text, p });
  if (text.includes("FROM auth_attempts")) return [{ n: 0 }];
  if (text.includes("INSERT INTO auth_attempts")) return [];
  if (text.includes("FROM colleges c JOIN college_leaders l") && text.includes("name_key")) return S.leaders.filter((l) => l.key === p[0] && ["pending", "approved"].includes(l.status)).length ? [{ 1: 1 }] : [];
  if (text.includes("FROM college_leaders WHERE lower(email)=$1 OR mobile")) return S.leaders.some((l) => l.email === p[0] || l.mobile === p[1]) ? [{}] : [];
  if (text.includes("FROM colleges WHERE join_code")) return p[0] === college.join_code ? [college] : [];
  if (text.includes("SELECT * FROM events WHERE id")) return p[0] === event.id ? [event] : [];
  if (text.includes("FROM participants WHERE event_id")) return S.parts.filter((x) => x.event_id === p[0] && x.college_id === p[1] && p[2].includes(x.roll.toLowerCase())).map((x) => ({ roll_number: x.roll }));
  if (text.includes("idempotency_key=$1")) return [];
  if (text.includes("FROM college_leaders l JOIN colleges c ON c.id = l.college_id")) {
    const l = S.leaders.find((x) => x.id === p[0] && x.status === "approved"); return l ? [{ id: l.id, college_id: l.college_id, full_name: "CL", email: l.email, college_name: "Test College", join_code: "X" }] : [];
  }
  if (text.includes("FROM registrations r JOIN events e") && !text.includes("ANY($2::uuid[])")) return [];
  if (text.includes("FROM admin_users WHERE id")) return S.admins.filter((a) => a.id === p[0]);
  if (text.includes("AND r.id = ANY($2::uuid[])") && text.includes("e.fee_paise")) return p[0] === "c-session" ? S.payable.filter((r) => p[1].includes(r.id)) : [];
  if (text.includes("FROM payment_batches WHERE razorpay_order_id=$1 AND college_id=$2")) return p[1] === "c-session" && p[0] === "order_1" ? [{ id: "b1", status: "created" }] : [];
  if (text.startsWith("WITH b AS")) { S.paidCalls.push(p); return S.paidCalls.length === 1 ? [{ registration_id: "x" }] : []; }
  if (text.includes("INSERT INTO webhook_events")) return S.seenEvents.has(p[0]) ? [] : (S.seenEvents.add(p[0]), [{ event_id: p[0] }]);
  if (text.includes("SELECT amount_paise FROM payment_batches")) return p[0] === "order_1" ? [{ amount_paise: 30000 }] : [];
  return [];
};
db.transaction = async (build) => { const out = build((t, p) => ({ text: t, p })); S.tx = out; if (S.failTx) throw S.failTx; return out.map(() => []); };

function call(method, url, { body, cookie, origin, host = "astra.test" } = {}) {
  return new Promise((resolve) => {
    const headers = { host }; if (cookie) headers.cookie = cookie; if (origin) headers.origin = origin;
    const req = { method, url, headers, body, socket: { remoteAddress: "1.1.1.1" } };
    const h = {}; const res = { statusCode: 200, setHeader: (k, v) => (h[k.toLowerCase()] = v), getHeader: (k) => h[k.toLowerCase()], end: (d) => resolve({ status: res.statusCode, body: d ? JSON.parse(d) : null, headers: h }) };
    handle(req, res);
  });
}
const tests = []; const test = (n, f) => tests.push([n, f]);

const clBody = { college_name: "Test College", full_name: "Asha Rao", email: "asha@test.edu", mobile: "9876543210", department: "BSc IT", course_year: "TY", password: "Passw0rdLong1", consent: true };

test("CL register rejects bad email / mobile / weak password / no consent", async () => {
  assert.equal((await call("POST", "/api/cl/register", { body: { ...clBody, email: "nope" } })).status, 400);
  assert.equal((await call("POST", "/api/cl/register", { body: { ...clBody, mobile: "12345" } })).status, 400);
  assert.equal((await call("POST", "/api/cl/register", { body: { ...clBody, password: "short1" } })).status, 400);
  assert.equal((await call("POST", "/api/cl/register", { body: { ...clBody, consent: false } })).status, 400);
});
test("CL register succeeds as pending and uses parameterised SQL", async () => {
  const r = await call("POST", "/api/cl/register", { body: clBody });
  assert.equal(r.status, 201); assert.equal(r.body.status, "pending");
  const sql = S.tx.map((x) => x.text).join(" ");
  assert.ok(!sql.includes("asha@test.edu") && !sql.includes("Test College"), "values must be bound parameters");
  assert.ok(S.tx[1].p.every((x) => x !== "Passw0rdLong1"), "password must be hashed");
});
test("Second CL for same college -> 409", async () => {
  S.leaders.push({ key: "test college", status: "pending", email: "x@x.com", mobile: "9000000000" });
  const r = await call("POST", "/api/cl/register", { body: { ...clBody, college_name: "TEST  college.", email: "b@test.edu", mobile: "9876500000" } });
  assert.equal(r.status, 409);
  S.leaders.length = 0;
});
test("Duplicate email/mobile -> 409", async () => {
  S.leaders.push({ key: "other", status: "approved", email: "asha@test.edu", mobile: "9000000001" });
  assert.equal((await call("POST", "/api/cl/register", { body: clBody })).status, 409);
  S.leaders.length = 0;
});
test("Pending CL cannot log in (after correct password)", async () => {
  const hash = await hashPassword("Passw0rdLong1");
  const orig = db.query;
  db.query = async (t, p) => (t.includes("FROM college_leaders l JOIN colleges c ON c.id=l.college_id WHERE lower") ? [{ id: "l1", password_hash: hash, status: "pending", college_status: "pending" }] : orig(t, p));
  const bad = await call("POST", "/api/cl/login", { body: { email: "asha@test.edu", password: "wrong" } });
  const pend = await call("POST", "/api/cl/login", { body: { email: "asha@test.edu", password: "Passw0rdLong1" } });
  db.query = orig;
  assert.equal(bad.status, 401); assert.equal(pend.status, 403);
});
test("Protected endpoints reject anonymous / forged cookies", async () => {
  for (const u of ["/api/cl/dashboard", "/api/cl/me", "/api/cl/export", "/api/admin/cl", "/api/admin/registrations", "/api/admin/events"])
    assert.equal((await call("GET", u)).status, 401, u);
  for (const [m, u] of [["POST", "/api/admin/cl/abc/approve"], ["POST", "/api/admin/events"], ["DELETE", "/api/admin/events/1"], ["PUT", "/api/admin/events/1"]])
    assert.equal((await call(m, u, { body: {} })).status, 401, u);
  assert.equal((await call("GET", "/api/admin/cl", { cookie: "astra_admin=forged.token.value" })).status, 401);
});
test("A CL session cookie cannot be used as an admin session", async () => {
  const res = { _h: {}, setHeader(k, v) { this._h[k] = v; }, getHeader(k) { return this._h[k]; } };
  await issueSession(res, "cl", { sub: "l1" });
  const cookie = res._h["Set-Cookie"].split(";")[0];
  assert.equal((await call("GET", "/api/admin/cl", { cookie })).status, 401);
});
test("CL dashboard is scoped to the session's college only", async () => {
  S.leaders.push({ id: "l1", college_id: "c-session", status: "approved", email: "a@a.com" });
  const res = { _h: {}, setHeader(k, v) { this._h[k] = v; }, getHeader(k) { return this._h[k]; } };
  await issueSession(res, "cl", { sub: "l1" });
  S.calls.length = 0;
  const r = await call("GET", "/api/cl/dashboard?college_id=OTHER", { cookie: res._h["Set-Cookie"].split(";")[0] });
  assert.equal(r.status, 200);
  const reg = S.calls.find((c) => c.text.includes("WHERE r.college_id=$1"));
  assert.deepEqual(reg.p, ["c-session"]);
  assert.ok(!S.calls.some((c) => c.p.includes("OTHER")));
  S.leaders.length = 0;
});
test("Cross-site POST blocked by origin check", async () => {
  assert.equal((await call("POST", "/api/cl/logout", { body: {}, origin: "https://evil.test" })).status, 403);
  assert.equal((await call("POST", "/api/cl/logout", { body: {}, origin: "https://astra.test", host: "astra.test" })).status, 200);
});

const people = (n, start = 1) => Array.from({ length: n }, (_, i) => ({ full_name: `Student ${start + i}`, department: "BSc", course_year: "SY", roll_number: `R${start + i}`, email: `s${start + i}@t.edu`, mobile: "9876543210" }));
const stu = (o = {}) => ({ code: "abcd-2345", event_id: 7, format: "team", team_name: "Team A", members: people(5), subs: [], extra: { synopsis: "Skit" }, consent: true, key: "idem-12345678", ...o });

test("Student registers via college code; college comes from code, browser college_id ignored", async () => {
  const r = await call("POST", "/api/student/register", { body: stu({ college_id: "evil", college_name: "Evil College" }) });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.match(r.body.reg_code, /^AST-[A-Z0-9]{6}$/);
  const insReg = S.tx[0]; assert.ok(insReg.p.includes("c1") && insReg.p.includes("Test College"));
  assert.ok(!S.tx.flatMap((x) => x.p).includes("evil") && !S.tx.flatMap((x) => x.p).includes("Evil College"));
});
test("Wrong / unknown college code -> 404", async () => {
  assert.equal((await call("POST", "/api/student/register", { body: stu({ code: "ZZZZ9999" }) })).status, 404);
});
test("Team size, format, required extra field, consent, duplicate roll validation", async () => {
  assert.equal((await call("POST", "/api/student/register", { body: stu({ members: people(3) }) })).status, 400);
  assert.equal((await call("POST", "/api/student/register", { body: stu({ format: "individual", members: people(1) }) })).status, 400);
  assert.equal((await call("POST", "/api/student/register", { body: stu({ extra: {} }) })).status, 400);
  assert.equal((await call("POST", "/api/student/register", { body: stu({ consent: false }) })).status, 400);
  const dup = people(5); dup[4].roll_number = "r1";
  assert.equal((await call("POST", "/api/student/register", { body: stu({ members: dup }) })).status, 400);
  assert.equal((await call("POST", "/api/student/register", { body: stu({ subs: people(3, 50) }) })).status, 400);
});
test("Already-registered student (same college+event) -> 409", async () => {
  S.parts.push({ event_id: 7, college_id: "c1", roll: "R2" });
  const r = await call("POST", "/api/student/register", { body: stu() });
  assert.equal(r.status, 409); assert.match(r.body.error, /R2/);
  S.parts.length = 0;
});
test("DB unique violation (race) maps to 409, not 500", async () => {
  S.failTx = Object.assign(new Error("duplicate key"), { code: "23505", constraint: "ux_participant_once_per_event" });
  const r = await call("POST", "/api/student/register", { body: stu() });
  S.failTx = null; assert.equal(r.status, 409);
});
test("Unexpected DB error returns generic 500 without internals", async () => {
  S.failTx = new Error("password authentication failed for user neondb_owner at host secret.neon.tech");
  const r = await call("POST", "/api/student/register", { body: stu() });
  S.failTx = null; assert.equal(r.status, 500, JSON.stringify(r.body)); assert.ok(!JSON.stringify(r.body).includes("neon"));
});
test("Public events endpoint never leaks internal columns", async () => {
  const orig = db.query; db.query = async (t) => (t.includes("FROM events WHERE is_active") ? [event] : orig(t));
  const r = await call("GET", "/api/events"); db.query = orig;
  assert.equal(r.status, 200); assert.equal(r.body.events[0].registration_open, true);
  assert.ok(!("fee_paise" in r.body.events[0]) && !("capacity" in r.body.events[0]));
});

// ---------- payments ----------
const U1 = "11111111-1111-4111-8111-111111111111", U2 = "22222222-2222-4222-8222-222222222222", U3 = "33333333-3333-4333-8333-333333333333";
async function clCookie() {
  S.leaders.push({ id: "l1", college_id: "c-session", status: "approved", email: "a@a.com" });
  const res = { _h: {}, setHeader(k, v) { this._h[k] = v; }, getHeader(k) { return this._h[k]; } };
  await issueSession(res, "cl", { sub: "l1" }); return res._h["Set-Cookie"].split(";")[0];
}
const sign = (secret, data) => createHmac("sha256", secret).update(data).digest("hex");

test("Payment endpoints require a signed-in CL", async () => {
  for (const [m, u] of [["GET", "/api/cl/payments"], ["POST", "/api/cl/payments/order"], ["POST", "/api/cl/payments/verify"]])
    assert.equal((await call(m, u, { body: {} })).status, 401, u);
});
test("Order amount is computed on the server; client amount is ignored; only own-college rows", async () => {
  const cookie = await clCookie();
  S.payable = [{ id: U1, fee_paise: 10000 }, { id: U2, fee_paise: 20000 }];
  const realFetch = globalThis.fetch; let sent;
  globalThis.fetch = async (url, o) => { sent = JSON.parse(o.body); return { ok: true, status: 200, json: async () => ({ id: "order_1", amount: sent.amount }) }; };
  const r = await call("POST", "/api/cl/payments/order", { cookie, body: { registration_ids: [U1, U2], amount: 1, amount_paise: 1 } });
  globalThis.fetch = realFetch;
  assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(sent.amount, 30000); assert.equal(r.body.amount, 30000);
  assert.ok(!JSON.stringify(r.body).includes("key_secret_xyz"), "secret must never be returned");
  const sel = S.calls.filter((c) => c.text.includes("AND r.id = ANY($2::uuid[])")).pop(); assert.equal(sel.p[0], "c-session");
  assert.equal(S.tx.length, 3);                                                   // batch + 2 items
  // another college's / unknown registration -> rejected, no order created
  globalThis.fetch = async () => { throw new Error("must not call Razorpay"); };
  const bad = await call("POST", "/api/cl/payments/order", { cookie, body: { registration_ids: [U1, U3] } });
  globalThis.fetch = realFetch; assert.equal(bad.status, 409);
  assert.equal((await call("POST", "/api/cl/payments/order", { cookie, body: { registration_ids: ["not-a-uuid"] } })).status, 400);
  S.leaders.length = 0;
});
test("Checkout verification: bad signature rejected, good one marks paid, other college's order not found", async () => {
  const cookie = await clCookie(); S.paidCalls.length = 0;
  const base = { razorpay_order_id: "order_1", razorpay_payment_id: "pay_1" };
  assert.equal((await call("POST", "/api/cl/payments/verify", { cookie, body: { ...base, razorpay_signature: "00" } })).status, 400);
  assert.equal(S.paidCalls.length, 0);
  assert.equal((await call("POST", "/api/cl/payments/verify", { cookie, body: { ...base, razorpay_order_id: "order_other", razorpay_signature: sign("key_secret_xyz", "order_other|pay_1") } })).status, 404);
  const ok = await call("POST", "/api/cl/payments/verify", { cookie, body: { ...base, razorpay_signature: sign("key_secret_xyz", "order_1|pay_1") } });
  assert.equal(ok.status, 200); assert.equal(S.paidCalls.length, 1);
  S.leaders.length = 0;
});
test("Webhook: signature required, duplicate events ignored, amount mismatch not paid", async () => {
  S.paidCalls.length = 0;
  const evt = (amount) => JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_9", order_id: "order_1", amount, status: "captured" } } } });
  const hook = async (raw, sig, id) => { // call the route directly with a raw body (as Vercel delivers it)
    const { webhook } = await import("../lib/routes/payments.js");
    const req = { headers: { "x-razorpay-signature": sig, "x-razorpay-event-id": id }, rawBody: raw };
    try { return await webhook({ req, body: JSON.parse(raw) }); } catch (e) { return { status: e.status }; }
  };
  assert.equal((await hook(evt(30000), "bad", "ev1")).status, 400);
  assert.equal((await hook(evt(30000), sign("key_secret_xyz", evt(30000)), "ev1")).status, 400, "checkout secret must not validate webhooks");
  assert.equal((await hook(evt(1), sign("wh_secret_123", evt(1)), "ev2")).ok, true); assert.equal(S.paidCalls.length, 0);
  assert.equal((await hook(evt(30000), sign("wh_secret_123", evt(30000)), "ev3")).ok, true); assert.equal(S.paidCalls.length, 1);
  assert.equal((await hook(evt(30000), sign("wh_secret_123", evt(30000)), "ev3")).duplicate, true); assert.equal(S.paidCalls.length, 1);
});

test("Session endpoint reports no role when signed out; new admin/CL actions need auth", async () => {
  const r = await call("GET", "/api/session"); assert.equal(r.status, 200); assert.equal(r.body.role, null);
  assert.equal((await call("POST", "/api/admin/cl/abc/reset-password", { body: {} })).status, 401);
  assert.equal((await call("POST", "/api/admin/cl/abc/reinstate", { body: {} })).status, 401);
  assert.equal((await call("POST", "/api/cl/password", { body: { current_password: "x", new_password: "y" } })).status, 401);
});
test("Admin reset-password returns a one-time temp password, stores only a hash", async () => {
  const res = { _h: {}, setHeader(k, v) { this._h[k] = v; }, getHeader(k) { return this._h[k]; } };
  await issueSession(res, "admin", { sub: "a1" }); const cookie = res._h["Set-Cookie"].split(";")[0];
  S.admins.push({ id: "a1", email: "admin@x.com", role: "admin" });
  const orig = db.query; const writes = [];
  db.query = async (t, p) => { if (t.includes("FROM college_leaders WHERE id=$1")) return [{ id: "l9", status: "approved" }]; if (t.startsWith("UPDATE college_leaders SET password_hash")) { writes.push(p); return []; } return orig(t, p); };
  const r = await call("POST", "/api/admin/cl/l9/reset-password", { cookie, body: {} }); db.query = orig; S.admins.length = 0;
  assert.equal(r.status, 200); const pw = r.body.temporary_password;
  assert.match(pw, /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]{12}$/);
  assert.ok(writes[0][1].startsWith("scrypt$") && !writes[0][1].includes(pw), "only a hash is stored");
});

let fail = 0;
for (const [n, f] of tests) { try { await f(); console.log("PASS", n); } catch (e) { fail++; console.log("FAIL", n, "\n  ", e.message.split("\n")[0]); } }
console.log(`\n${tests.length - fail}/${tests.length} passed`); process.exit(fail ? 1 : 0);
