"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EventCard } from "./event-card";
import { cn } from "@/lib/utils";
import type { EventRow } from "@/lib/db";

export function EventsBrowser({ events, initialCat }: { events: EventRow[]; initialCat: string }) {
  const [cat, setCat] = useState(initialCat || "All");
  const [q, setQ] = useState("");
  const cats = ["All", ...Array.from(new Set(events.map((e) => e.category)))];
  const list = useMemo(() => events.filter((e) =>
    (cat === "All" || e.category === cat) && `${e.name} ${e.description} ${e.subcategory ?? ""}`.toLowerCase().includes(q.toLowerCase())), [events, cat, q]);
  return (
    <>
      <div className="relative mt-6 max-w-md">
        <Search size={18} className="absolute left-3 top-3 text-bone/50" />
        <input className="field pl-10" placeholder="Search events" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search events" />
      </div>
      <div className="-mx-6 mt-5 flex gap-2 overflow-x-auto px-6 pb-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} className={cn("shrink-0 rounded-full border px-4 py-1.5 transition", cat === c ? "border-ember bg-ember text-night" : "border-white/20 hover:border-gold")}>{c}</button>
        ))}
      </div>
      <p className="mt-4 text-bone/60">{list.length} event{list.length === 1 ? "" : "s"}</p>
      <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{list.map((e) => <EventCard key={e.id} e={e} />)}</div>
      {!list.length && <p className="mt-10 text-bone/70">No events match. Clear the search or pick another category.</p>}
    </>
  );
}
