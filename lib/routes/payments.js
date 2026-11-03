import { randomUUID } from "node:crypto";
import { q, tx } from "../db.js";
import { HttpError } from "../http.js";
import { requireCL, rateLimit } from "../auth.js";
import { createOrder, verifyCheckoutSignature, verifyWebhookSignature, fetchOrderStatus } from "../razorpay.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Payable = this college's registration, fee > 0, still unpaid, not cancelled/waitlisted.
export async function summary({ req }) {
  const l = await requireCL(req);
  const items = await q(
    `SELECT r.id, r.reg_code, r.team_name, r.format, e.name AS event_name, e.fee_paise * CASE WHEN e.fee_per_person THEN (SELECT count(*)::int FROM participants p WHERE p.registration_id=r.id AND p.role<>'substitute') ELSE 1 END AS fee_paise
       FROM registrations r JOIN events e ON e.id=r.event_id
      WHERE r.college_id=$1 AND r.payment_status='pending' AND e.fee_paise>0 AND r.status NOT IN ('cancelled','waitlisted')
      ORDER BY r.created_at`, [l.college_id]);
  const history = await q(
    `SELECT b.id, b.amount_paise, b.status, b.created_at, b.verified_at, b.razorpay_payment_id, b.razorpay_order_id,
            (SELECT count(*)::int FROM payment_batch_items i WHERE i.batch_id=b.id) AS registrations
       FROM payment_batches b WHERE b.college_id=$1 ORDER BY b.created_at DESC LIMIT 50`, [l.college_id]);
  // Expose stale pending batches so the frontend can show a Cancel button
  const pending = await q(
    `SELECT b.id, b.razorpay_order_id, b.amount_paise, b.created_at,
            array_agg(i.registration_id) AS registration_ids
       FROM payment_batches b JOIN payment_batch_items i ON i.batch_id=b.id
      WHERE b.college_id=$1 AND b.status='created'
      GROUP BY b.id ORDER BY b.created_at DESC LIMIT 5`, [l.college_id]);
  return { payable: items, total_paise: items.reduce((s, i) => s + i.fee_paise, 0), history, pending, configured: !!process.env.RAZORPAY_KEY_ID };
}

// The amount is ALWAYS computed here from the database; the browser only says which registrations.
// If an existing valid 'created' batch covers the same registrations and same amount, reuse it.
export async function createBatch({ req, body }) {
  const l = await requireCL(req);
  await rateLimit(req, "pay-order", 15, 900, l.id);
  const ids = [...new Set(Array.isArray(body.registration_ids) ? body.registration_ids : [])];
  if (!ids.length || ids.length > 300 || !ids.every((i) => typeof i === "string" && UUID.test(i))) throw new HttpError(400, "Select the registrations to pay for.");

  // Auto-expire stale 'created' batches (older than 30 min) for this college before locking check
  await q(
    `UPDATE payment_batches SET status='failed'
      WHERE college_id=$1 AND status='created' AND created_at < now() - interval '30 minutes'`,
    [l.college_id]);

  // Fetch the server-computed fee for these registrations (must be payable and owned by this college)
  const rows = await q(
    `SELECT r.id, e.fee_paise * CASE WHEN e.fee_per_person THEN (SELECT count(*)::int FROM participants p WHERE p.registration_id=r.id AND p.role<>'substitute') ELSE 1 END AS fee_paise FROM registrations r JOIN events e ON e.id=r.event_id
      WHERE r.college_id=$1 AND r.id = ANY($2::uuid[]) AND r.payment_status='pending' AND e.fee_paise>0 AND r.status NOT IN ('cancelled','waitlisted')`,
    [l.college_id, ids]);

  if (rows.length !== ids.length) throw new HttpError(409, "Some selected registrations are already paid, cannot be paid, or are not found. Refresh and try again.");
  const total = rows.reduce((s, r) => s + r.fee_paise, 0);
  if (total <= 0) throw new HttpError(400, "Nothing to pay.");

  // Check for an existing 'created' batch for exactly the same registrations & amount
  const existing = await q(
    `SELECT b.id, b.razorpay_order_id, b.amount_paise, b.leader_id
       FROM payment_batches b
      WHERE b.college_id=$1 AND b.status='created' AND b.amount_paise=$2
        AND b.created_at >= now() - interval '30 minutes'
        AND (SELECT count(*) FROM payment_batch_items i WHERE i.batch_id=b.id) = $3
        AND NOT EXISTS (
          SELECT 1 FROM payment_batch_items i WHERE i.batch_id=b.id AND i.registration_id <> ALL($4::uuid[])
        )
      ORDER BY b.created_at DESC LIMIT 1`,
    [l.college_id, total, ids.length, ids]);

  if (existing.length && existing[0].leader_id === l.id) {
    // Reuse the existing order (same leader, same registrations, same amount, still fresh)
    const ex = existing[0];
    return { order_id: ex.razorpay_order_id, amount: ex.amount_paise, currency: "INR", key_id: process.env.RAZORPAY_KEY_ID, college: l.college_name, name: l.full_name, email: l.email, count: ids.length, reused: true };
  }

  // Check for a different active batch for any of these registrations (from same or different leader)
  const conflict = await q(
    `SELECT 1 FROM payment_batch_items i JOIN payment_batches b ON b.id=i.batch_id
      WHERE i.registration_id = ANY($1::uuid[]) AND b.status='created' AND b.created_at >= now() - interval '30 minutes'
      LIMIT 1`,
    [ids]);
  if (conflict.length) throw new HttpError(409, "A payment is already in progress for some of these registrations. Wait a few minutes or cancel it from the Payments section, then retry.");

  const batchId = randomUUID();
  const order = await createOrder({ amountPaise: total, receipt: "b_" + batchId.slice(0, 12), notes: { batch_id: batchId, college_id: l.college_id } });
  if (order.amount !== total) throw new HttpError(502, "Payment amount mismatch. Please try again.");
  await tx((t) => [
    t(`INSERT INTO payment_batches (id, college_id, leader_id, razorpay_order_id, amount_paise) VALUES ($1,$2,$3,$4,$5)`, [batchId, l.college_id, l.id, order.id, total]),
    ...rows.map((r) => t(`INSERT INTO payment_batch_items (batch_id, registration_id, amount_paise) VALUES ($1,$2,$3)`, [batchId, r.id, r.fee_paise])),
  ]);
  return { order_id: order.id, amount: total, currency: "INR", key_id: process.env.RAZORPAY_KEY_ID, college: l.college_name, name: l.full_name, email: l.email, count: rows.length };
}

// Idempotent: marks a batch paid once; replays (verify + webhook) change nothing.
export async function markPaid(orderId, paymentId) {
  return q(
    `WITH b AS (
       UPDATE payment_batches SET status='paid', razorpay_payment_id=$2, verified_at=now()
        WHERE razorpay_order_id=$1 AND status<>'paid' RETURNING id),
     r AS (
       UPDATE registrations SET payment_status='paid', status=CASE WHEN status='pending' THEN 'confirmed' ELSE status END, updated_at=now()
        WHERE payment_status='pending' AND status<>'cancelled'
          AND id IN (SELECT registration_id FROM payment_batch_items WHERE batch_id IN (SELECT id FROM b)) RETURNING id)
     INSERT INTO payments (registration_id, amount_paise, currency, status, method, verified_at)
     SELECT i.registration_id, i.amount_paise, 'INR', 'captured', 'razorpay_college_batch', now()
       FROM payment_batch_items i WHERE i.batch_id IN (SELECT id FROM b) AND i.registration_id IN (SELECT id FROM r)
     RETURNING registration_id`, [orderId, paymentId]);
}

// Mark a batch as failed (idempotent — won't overwrite a paid batch).
export async function markFailed(orderId, reason) {
  await q(
    `UPDATE payment_batches SET status='failed', failure_reason=$2
      WHERE razorpay_order_id=$1 AND status='created'`,
    [orderId, (reason || "payment_failed").slice(0, 200)]);
}

export async function verify({ req, body }) {
  const l = await requireCL(req);
  const { razorpay_order_id: o, razorpay_payment_id: p, razorpay_signature: s } = body;
  if (typeof o !== "string" || typeof p !== "string" || typeof s !== "string") throw new HttpError(400, "Invalid payment response.");
  const [b] = await q("SELECT id, status FROM payment_batches WHERE razorpay_order_id=$1 AND college_id=$2", [o, l.college_id]);
  if (!b) throw new HttpError(404, "Payment not found for your college.");
  if (!verifyCheckoutSignature(o, p, s)) throw new HttpError(400, "Payment could not be verified.");
  const done = await markPaid(o, p);
  return { ok: true, registrations_paid: done.length, already: b.status === "paid" };
}

// Cancel a pending (created) payment batch — authenticated CL only, owns the batch.
// Reconciles with Razorpay: will NOT cancel if the order is already captured.
export async function cancelPending({ req, body }) {
  const l = await requireCL(req);
  const batchId = String(body.batch_id || "");
  if (!UUID.test(batchId)) throw new HttpError(400, "Invalid batch ID.");

  const [b] = await q(
    "SELECT id, razorpay_order_id, status, college_id FROM payment_batches WHERE id=$1",
    [batchId]);
  if (!b) throw new HttpError(404, "Batch not found.");
  if (b.college_id !== l.college_id) throw new HttpError(403, "Not your payment.");
  if (b.status === "paid") throw new HttpError(409, "This payment was already completed and cannot be cancelled.");
  if (b.status === "failed") return { ok: true, already_failed: true };

  // Reconcile with Razorpay before releasing
  const orderStatus = await fetchOrderStatus(b.razorpay_order_id);
  if (orderStatus === "paid") {
    // Race: Razorpay says paid but DB not updated yet — trigger markPaid if we have a payment ID
    throw new HttpError(409, "This payment was captured by Razorpay. Please refresh — it will be confirmed shortly.");
  }
  // Safe to mark as failed (order is 'created' or 'attempted', not 'paid')
  await markFailed(b.razorpay_order_id, "cancelled_by_leader");
  return { ok: true };
}

// Razorpay -> server. Authenticated ONLY by the HMAC signature of the raw body.
export async function webhook({ req, body }) {
  const raw = req.rawBody;
  if (!verifyWebhookSignature(raw, req.headers["x-razorpay-signature"])) throw new HttpError(400, "Invalid signature.");
  const eventId = String(req.headers["x-razorpay-event-id"] || "").slice(0, 120);
  if (eventId) {
    const fresh = await q("INSERT INTO webhook_events (event_id, event_type) VALUES ($1,$2) ON CONFLICT (event_id) DO NOTHING RETURNING event_id", [eventId, String(body.event || "").slice(0, 60)]);
    if (!fresh.length) return { ok: true, duplicate: true };
  }
  if (body.event === "payment.captured" || body.event === "order.paid") {
    const pay = body.payload?.payment?.entity;
    if (pay?.order_id && pay?.id && pay.status === "captured") {
      const [b] = await q("SELECT amount_paise FROM payment_batches WHERE razorpay_order_id=$1", [pay.order_id]);
      if (b && b.amount_paise === pay.amount) await markPaid(pay.order_id, pay.id);
      else console.error("[webhook] unknown order or amount mismatch", pay.order_id);
    }
  }
  if (body.event === "payment.failed") {
    const pay = body.payload?.payment?.entity;
    if (pay?.order_id) {
      const reason = pay.error_description || pay.error_code || "payment_failed";
      await markFailed(pay.order_id, reason);
    }
  }
  return { ok: true };
}
