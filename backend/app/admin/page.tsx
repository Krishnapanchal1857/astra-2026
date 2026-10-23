"use client";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2, Plus, LogOut } from "lucide-react";
import type { EventRow } from "@/lib/db";

const CATS = ["Performing Arts", "Literary Arts", "Fine Arts", "Tech Arts", "Sports", "Gaming", "Fun & Games", "Informal Events", "Public Relations"];
const blank: Partial<EventRow> = { name: "", category: CATS[0], subcategory: "", description: "", team_size: "", duration: "", format: "", components: "", mumbai_angle: "", flagship: false, event_date: "", venue: "", fee: 0, is_open: true };
const text: [keyof EventRow, string][] = [["name", "Event name"], ["subcategory", "Sub-category"], ["team_size", "Team size"], ["duration", "Duration"], ["format", "Format"], ["event_date", "Date / time"], ["venue", "Venue"], ["fee", "Fee (₹)"]];
const long: [keyof EventRow, string][] = [["description", "Description"], ["components", "Components"], ["mumbai_angle", "Mumbai angle"]];

export default function Admin() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pw, setPw] = useState(""); const [msg, setMsg] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]); const [regs, setRegs] = useState<any[]>([]);
  const [form, setForm] = useState<Partial<EventRow> | null>(null); const [tab, setTab] = useState<"events" | "regs">("events");

  const load = useCallback(async () => {
    setEvents(await (await fetch("/api/events")).json());
    const r = await fetch("/api/registrations"); if (r.ok) setRegs(await r.json());
  }, []);
  useEffect(() => { fetch("/api/admin/login").then((r) => r.json()).then((d) => { setAuthed(d.admin); if (d.admin) load(); }); }, [load]);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (r.ok) { setAuthed(true); setMsg(""); load(); } else setMsg("Wrong password.");
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!form) return;
    const r = await fetch(form.id ? `/api/events/${form.id}` : "/api/events", { method: form.id ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (r.ok) { setForm(null); setMsg("Saved."); load(); } else setMsg((await r.json()).error || "Could not save.");
  }
  async function del(e: EventRow) {
    if (!confirm(`Delete "${e.name}" and its registrations?`)) return;
    await fetch(`/api/events/${e.id}`, { method: "DELETE" }); load();
  }
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  if (authed === null) return null;
  if (!authed) return (
    <main className="grid min-h-screen place-items-center px-6">
      <form onSubmit={login} className="w-full max-w-sm space-y-4">
        <h1 className="font-display text-3xl font-black">Admin sign in</h1>
        <input type="password" className="field" placeholder="Admin password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
        {msg && <p role="alert" className="text-red-300">{msg}</p>}
        <button className="btn w-full">Sign in</button>
      </form>
    </main>
  );

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-24 md:pl-32">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-black md:text-5xl">Admin</h1>
        <div className="flex gap-2">
          <button className="btn" onClick={() => setForm({ ...blank })}><Plus size={18} />Add event</button>
          <button className="rounded-md border border-white/20 px-3" aria-label="Sign out" onClick={async () => { await fetch("/api/admin/login", { method: "DELETE" }); setAuthed(false); }}><LogOut size={18} /></button>
        </div>
      </div>
      {msg && <p className="mt-3 text-gold">{msg}</p>}
      <div className="mt-6 flex gap-2">
        {(["events", "regs"] as const).map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-full border px-4 py-1.5 ${tab === t ? "border-ember bg-ember text-night" : "border-white/20"}`}>{t === "events" ? `Events (${events.length})` : `Registrations (${regs.length})`}</button>)}
      </div>

      {form && (
        <form onSubmit={save} className="mt-6 grid gap-3 rounded-lg border border-gold/40 bg-white/5 p-4 sm:grid-cols-2">
          <h2 className="font-display text-xl font-bold sm:col-span-2">{form.id ? "Edit event" : "New event"}</h2>
          <select className="field" value={form.category} onChange={(e) => set("category", e.target.value)}>{CATS.map((c) => <option key={c} className="text-black">{c}</option>)}</select>
          {text.map(([k, label]) => <input key={k} className="field" placeholder={label} required={k === "name"} value={(form[k] as any) ?? ""} onChange={(e) => set(k, e.target.value)} />)}
          {long.map(([k, label]) => <textarea key={k} rows={2} className="field sm:col-span-2" placeholder={label} value={(form[k] as any) ?? ""} onChange={(e) => set(k, e.target.value)} />)}
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!form.flagship} onChange={(e) => set("flagship", e.target.checked)} />Flagship event</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_open !== false} onChange={(e) => set("is_open", e.target.checked)} />Registrations open</label>
          <div className="flex gap-2 sm:col-span-2"><button className="btn">Save event</button><button type="button" className="rounded-md border border-white/20 px-4" onClick={() => setForm(null)}>Cancel</button></div>
        </form>
      )}

      {tab === "events" ? (
        <div className="mt-6 divide-y divide-white/10 rounded-lg border border-white/10">
          {events.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0"><p className="truncate font-semibold">{e.no}. {e.name}{e.flagship && " ★"}</p><p className="text-sm text-bone/60">{e.category}{e.is_open ? "" : " · closed"}</p></div>
              <div className="flex shrink-0 gap-2">
                <button aria-label={`Edit ${e.name}`} className="rounded-md border border-white/20 p-2 hover:border-gold" onClick={() => setForm(e)}><Pencil size={16} /></button>
                <button aria-label={`Delete ${e.name}`} className="rounded-md border border-white/20 p-2 hover:border-red-400" onClick={() => del(e)}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-white/5"><tr>{["Event", "Leader", "Team", "College", "Email", "Phone", "When"].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
            <tbody>{regs.map((r) => <tr key={r.id} className="border-t border-white/10"><td className="p-3">{r.event_name}</td><td className="p-3">{r.leader_name}</td><td className="p-3">{r.team_name}</td><td className="p-3">{r.college}</td><td className="p-3">{r.email}</td><td className="p-3">{r.phone}</td><td className="p-3">{new Date(r.created_at).toLocaleString()}</td></tr>)}</tbody>
          </table>
          {!regs.length && <p className="p-4 text-bone/60">No registrations yet.</p>}
        </div>
      )}
    </main>
  );
}
