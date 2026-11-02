/* Connects every event on the static category pages to the live registration form.
   Each "Register Now" button gets /register.html?event=<database id>. Matching uses the
   event name from /api/events, so the database stays the single source of truth. */
(function () {
  const norm = (t) => String(t || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const fallback = "/register.html";
  function find(events, title) {
    const n = norm(title);
    if (!n) return null;
    return events.find((e) => norm(e.name) === n) || events.find((e) => norm(e.name).startsWith(n)) ||
      (n.length >= 4 ? events.find((e) => norm(e.name).includes(n)) : null) || null;
  }
  function titleFor(btn) {
    for (let el = btn.parentElement; el && el !== document.body; el = el.parentElement) {
      const h = el.querySelectorAll("h2");
      if (h.length === 1) return h[0].textContent;
    }
    return "";
  }
  function link(events) {
    document.querySelectorAll("a.join-btn").forEach((a) => {
      const ev = find(events, titleFor(a));
      a.href = ev ? `${fallback}?event=${ev.id}` : fallback;
      a.removeAttribute("target");
    });
  }
  fetch("/api/events").then((r) => (r.ok ? r.json() : Promise.reject())).then((d) => link(d.events))
    .catch(() => document.querySelectorAll("a.join-btn").forEach((a) => (a.href = fallback)));
})();
