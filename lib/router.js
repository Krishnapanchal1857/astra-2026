import { HttpError, send, readJson, checkOrigin } from "./http.js";
import * as events from "./routes/events.js";
import * as cl from "./routes/cl.js";
import * as student from "./routes/student.js";
import * as admin from "./routes/admin.js";
import * as payments from "./routes/payments.js";
import * as session from "./routes/session.js";

const R = (method, pattern, fn) => ({ method, re: new RegExp("^" + pattern.replace(/:(\w+)/g, "(?<$1>[^/]+)") + "/?$"), fn });
export const routes = [
  R("GET", "/api/events", events.list),
  R("GET", "/api/session", session.get),
  R("POST", "/api/cl/password", cl.changePassword),
  R("GET", "/api/college/:code", student.collegeLookup),
  R("POST", "/api/student/register", student.register),

  R("POST", "/api/cl/register", cl.register),
  R("POST", "/api/cl/login", cl.login),
  R("POST", "/api/cl/logout", cl.logout),
  R("GET", "/api/cl/me", cl.me),
  R("GET", "/api/cl/dashboard", cl.dashboard),
  R("GET", "/api/cl/export", cl.exportCsv),
  R("GET", "/api/cl/payments", payments.summary),
  R("POST", "/api/cl/payments/order", payments.createBatch),
  R("POST", "/api/cl/payments/verify", payments.verify),
  R("POST", "/api/razorpay/webhook", payments.webhook),

  R("POST", "/api/admin/login", admin.login),
  R("POST", "/api/admin/logout", admin.logout),
  R("GET", "/api/admin/me", admin.me),
  R("GET", "/api/admin/cl", admin.listCL),
  R("POST", "/api/admin/cl/:id/:action", admin.decideCL),
  R("GET", "/api/admin/registrations", admin.registrations),
  R("POST", "/api/admin/registrations/:id/status", admin.setRegistrationStatus),
  R("GET", "/api/admin/events", events.adminList),
  R("POST", "/api/admin/events", events.create),
  R("PUT", "/api/admin/events/:id", events.update),
  R("DELETE", "/api/admin/events/:id", events.remove),
];

export async function handle(req, res) {
  try {
    const url = new URL(req.url, "http://x");
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const matches = routes.filter((r) => r.re.test(path));
    if (!matches.length) throw new HttpError(404, "Not found.");
    const route = matches.find((r) => r.method === req.method);
    if (!route) throw new HttpError(405, "Method not allowed.");
    checkOrigin(req);
    const params = { ...route.re.exec(path).groups };
    const body = req.method === "GET" || req.method === "DELETE" ? {} : await readJson(req);
    const out = await route.fn({ req, res, body, params, query: Object.fromEntries(url.searchParams) });
    if (out && out.raw !== undefined) {
      res.statusCode = 200;
      res.setHeader("Content-Type", out.type);
      res.setHeader("Content-Disposition", `attachment; filename="${out.filename}"`);
      res.setHeader("Cache-Control", "no-store");
      return res.end(out.raw);
    }
    if (out && out.status && out.body) return send(res, out.status, out.body);
    return send(res, 200, out ?? { ok: true });
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.message, ...e.extra });
    console.error("[api error]", e?.message);            // message only: never log secrets or SQL parameters
    return send(res, 500, { error: "Something went wrong. Please try again." });
  }
}
