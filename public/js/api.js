/* Shared helpers for all ASTRA pages (plain browser JavaScript, no build step). */
window.$ = (s, r = document) => r.querySelector(s);
window.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
window.api = async function (path, opts = {}) {
  const o = { method: opts.method || "GET", headers: {}, credentials: "same-origin" };
  if (opts.body !== undefined) { o.headers["Content-Type"] = "application/json"; o.body = JSON.stringify(opts.body); }
  let r;
  try { r = await fetch(path, o); } catch { throw new Error("Network error. Please check your connection and try again."); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error || "Request failed."); e.status = r.status; throw e; }
  return d;
};
window.showMsg = (el, text, cls = "err") => { el.innerHTML = text ? `<div class="${cls}" role="alert">${esc(text)}</div>` : ""; };
window.fmtDate = (s) => new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
