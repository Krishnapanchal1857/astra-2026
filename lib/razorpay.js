// Minimal Razorpay client (no SDK): create order + verify signatures. Secrets stay server-side.
import { createHmac, timingSafeEqual } from "node:crypto";
import { HttpError } from "./http.js";

export const razorpayConfigured = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export async function createOrder({ amountPaise, receipt, notes }) {
  if (!razorpayConfigured()) throw new HttpError(503, "Online payment is not available yet. Please contact the ASTRA committee.");
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  let r;
  try {
    r = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt: receipt.slice(0, 40), notes }),
    });
  } catch { throw new HttpError(502, "Could not reach the payment provider. Please try again."); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.id) { console.error("[razorpay] order failed", r.status, d?.error?.code); throw new HttpError(502, "The payment provider rejected the request. Please try again."); }
  return d; // { id, amount, currency, ... }
}

const safeEq = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const hmac = (secret, data) => createHmac("sha256", secret).update(data).digest("hex");

// Checkout success callback: signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret)
export function verifyCheckoutSignature(orderId, paymentId, signature) {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;
  return safeEq(hmac(process.env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), signature || "");
}
// Webhook: signature = HMAC_SHA256(raw request body, webhook_secret)
export function verifyWebhookSignature(rawBody, signature) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET || !rawBody) return false;
  return safeEq(hmac(process.env.RAZORPAY_WEBHOOK_SECRET, rawBody), signature || "");
}
