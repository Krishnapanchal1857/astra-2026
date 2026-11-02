import { handle } from "../lib/router.js";

// Raw body is needed to verify Razorpay webhook signatures.
export const config = { api: { bodyParser: false } };

export default function handler(req, res) { return handle(req, res); }
