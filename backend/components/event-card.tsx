import Link from "next/link";
import { Users, Clock, Star } from "lucide-react";
import type { EventRow } from "@/lib/db";
export function EventCard({ e }: { e: EventRow }) {
  return (
    <Link href={`/events/${e.id}`} className="clip-card group flex h-full flex-col gap-3 border border-white/10 bg-gradient-to-br from-white/10 to-white/[0.02] p-5 transition hover:border-gold/60 hover:bg-white/10">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl font-bold leading-tight text-bone group-hover:text-gold">{e.name}</h3>
        {e.flagship && <span className="flex shrink-0 items-center gap-1 rounded-sm bg-ember px-2 py-0.5 text-xs font-bold text-night"><Star size={12} />Flagship</span>}
      </div>
      <p className="text-sm text-gold/90">{e.subcategory ? `${e.category} · ${e.subcategory}` : e.category}</p>
      <p className="line-clamp-3 text-bone/75">{e.description}</p>
      <div className="mt-auto flex flex-wrap gap-4 pt-2 text-sm text-bone/70">
        <span className="flex items-center gap-1"><Users size={14} />{e.team_size}</span>
        <span className="flex items-center gap-1"><Clock size={14} />{e.duration}</span>
      </div>
    </Link>
  );
}
