"use client";
import { useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function RegisterForm({ eventId, isOpen }: { eventId: number; isOpen: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "done">("idle");
  const [err, setErr] = useState("");
  if (!isOpen) return <p className="rounded-md border border-white/15 p-4 text-bone/80">Registrations for this event are closed.</p>;
  if (state === "done") return <p className="flex items-center gap-2 rounded-md border border-gold/50 p-4 text-gold"><CheckCircle2 /> Registration received. The events committee will contact you by email.</p>;
  async function submit(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault(); setState("busy"); setErr("");
    const body = { ...Object.fromEntries(new FormData(ev.currentTarget)), event_id: eventId };
    const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) return setState("done");
    setErr((await res.json().catch(() => ({}))).error || "Something went wrong. Try again."); setState("idle");
  }
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <input name="leader_name" required className="field" placeholder="Your name *" />
      <input name="team_name" className="field" placeholder="Team name (if any)" />
      <input name="email" type="email" required className="field" placeholder="Email *" />
      <input name="phone" type="tel" required className="field" placeholder="Phone *" />
      <input name="college" required className="field sm:col-span-2" placeholder="College / contingent *" />
      <textarea name="members" rows={3} className="field sm:col-span-2" placeholder="Other team members (one per line)" />
      {err && <p role="alert" className="text-red-300 sm:col-span-2">{err}</p>}
      <button className="btn sm:col-span-2" disabled={state === "busy"}>{state === "busy" ? "Registering…" : "Register"}</button>
    </form>
  );
}
