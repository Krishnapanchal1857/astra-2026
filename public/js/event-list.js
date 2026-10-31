/* event.html: lists every event from the database with a Register button (ASTRA theme variables). */
(function () {
  const host = document.getElementById("all-events");
  if (!host) return;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const css = `#all-events{max-width:1100px;margin:0 auto;padding:56px 20px;color:var(--cream,#fbe9c6)}
  #all-events h2{font-size:clamp(1.6rem,4vw,2.4rem);letter-spacing:.06em;margin:0 0 6px;color:var(--sun,#ffb23e)}
  #all-events h3{margin:26px 0 8px;color:var(--rose,#e58f8a);letter-spacing:.08em;text-transform:uppercase;font-size:.95rem}
  #all-events ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
  #all-events li{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 14px;border:1px solid rgba(251,233,198,.25);border-radius:12px;background:rgba(26,11,16,.55)}
  #all-events small{display:block;opacity:.75}
  #all-events a.go{flex:none;padding:10px 14px;border-radius:999px;background:var(--sun,#ffb23e);color:var(--ink,#1a0b10);font-weight:700;text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
  #all-events a.go:focus-visible,#all-events a.cl:focus-visible{outline:3px solid var(--cream,#fbe9c6);outline-offset:2px}
  #all-events .soon{opacity:.7;font-size:.85rem}#all-events a.cl{color:var(--sun,#ffb23e)}`;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  host.innerHTML = '<h2>Register for an event</h2><p>Students register with the college code from their <a class="cl" href="/cl-register.html">College Leader</a>.</p><div id="ael">Loading events…</div>';
  fetch("/api/events").then((r) => (r.ok ? r.json() : Promise.reject())).then(({ events }) => {
    const groups = new Map();
    events.slice().sort((a, b) => a.cat_sort - b.cat_sort || a.id - b.id).forEach((e) => { if (!groups.has(e.category)) groups.set(e.category, []); groups.get(e.category).push(e); });
    const $ael = document.getElementById("ael");
    $ael.innerHTML = [...groups].map(([cat, list]) => `<h3>${esc(cat)}</h3><ul>` + list.map((e) =>
      `<li><span>${esc(e.name)}<small>${esc(e.subcategory)}</small></span>${e.registration_open ? `<a class="go" href="/register.html?event=${e.id}">Register<span class="sr" style="position:absolute;left:-9999px"> for ${esc(e.name)}</span></a>` : '<span class="soon">Opening soon</span>'}</li>`).join("") + "</ul>").join("");
  }).catch(() => { document.getElementById("ael").textContent = "Events could not be loaded. Please refresh."; });
})();
