import Link from "next/link";
import ParallaxHero from "@/components/ui/parallax-hero";
import { EventCard } from "@/components/event-card";
import { getEvents } from "@/lib/db";
export const dynamic = "force-dynamic";

export default async function Home() {
  const events = await getEvents();
  const flagships = events.filter((e) => e.flagship);
  const cats = Array.from(new Set(events.map((e) => e.category)));
  return (
    <main>
      <ParallaxHero title="ASTRA 2026">
        <div className="pointer-events-none absolute inset-x-0 bottom-[14%] z-[200] flex flex-col items-center gap-3 px-6 text-center md:bottom-[10%]">
          <p className="font-display text-lg tracking-[0.25em] md:text-2xl">Sathaye College presents</p>
          <p className="font-display text-2xl font-bold text-gold md:text-4xl">Mumbai Meri Jaan</p>
          <p className="text-sm tracking-widest text-bone/85 md:text-lg">Ek Shehar • Hazaar Kahaaniyan • Ek Jashn</p>
          <Link href="/events" className="btn pointer-events-auto mt-3">Register for events</Link>
        </div>
      </ParallaxHero>

      <section id="about" className="mx-auto max-w-5xl px-6 py-20 md:pl-32">
        <h2 className="font-display text-3xl font-bold md:text-5xl">One city, {events.length || 50}+ events</h2>
        <p className="mt-4 max-w-2xl text-lg text-bone/80">ASTRA 2026 turns the whole college into Mumbai: local trains, gully cricket, Marine Drive monsoons and Bollywood nostalgia. Pick a category, choose your events and register your team in a minute.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          {cats.map((c) => <Link key={c} href={`/events?cat=${encodeURIComponent(c)}`} className="rounded-full border border-gold/40 px-4 py-1.5 text-gold hover:bg-gold hover:text-night">{c}</Link>)}
        </div>
      </section>

      <section id="flagships" className="mx-auto max-w-6xl px-6 pb-24 md:pl-32">
        <h2 className="font-display text-3xl font-bold md:text-5xl">Flagship events</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {flagships.map((e) => <EventCard key={e.id} e={e} />)}
        </div>
        {!events.length && <p className="mt-6 text-bone/70">No events yet. Run <code>npm run seed</code> after adding your Neon DATABASE_URL.</p>}
      </section>

      <footer id="contact" className="border-t border-white/10 px-6 py-10 text-center text-bone/70 md:pl-32">
        <p className="font-display text-xl text-bone">ASTRA 2026 · Sathaye College</p>
        <p className="mt-2">Contact the events committee for queries about registration.</p>
      </footer>
    </main>
  );
}
