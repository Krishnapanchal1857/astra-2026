export class HttpError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

export function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  if (req.body !== undefined && req.body !== null && req.body !== "") {
    if (typeof req.body === "object") return req.body;
    try { return JSON.parse(req.body); } catch { throw new HttpError(400, "Invalid JSON body."); }
  }
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > 200_000) throw new HttpError(413, "Request too large.");
    chunks.push(c);
  }
  if (!chunks.length) return {};
  req.rawBody = Buffer.concat(chunks).toString("utf8");   // exact bytes, needed to verify webhook signatures
  try { return JSON.parse(req.rawBody); }
  catch { throw new HttpError(400, "Invalid JSON body."); }
}

export function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

const isProd = () => !!process.env.VERCEL || process.env.NODE_ENV === "production";

export function cookieHeader(name, value, maxAgeSec) {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${maxAgeSec}`];
  if (isProd()) parts.push("Secure");
  return parts.join("; ");
}

export function clientIp(req) {
  const xff = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return xff || req.socket?.remoteAddress || "unknown";
}

// CSRF defence for state-changing requests: browsers always send Origin on cross-site POSTs.
export function checkOrigin(req) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.origin;
  if (!origin) return; // non-browser client (curl); cookies are SameSite=Strict anyway
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  let o;
  try { o = new URL(origin); } catch { throw new HttpError(403, "Bad origin."); }
  if (o.host !== host) throw new HttpError(403, "Cross-site request blocked.");
}
