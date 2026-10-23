import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvent } from "@/lib/db";
import { RegisterForm } from "@/components/register-form";
export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: { id: string } }) {
  const e = await getEvent(Number(params.id));
  if (!e) notFound();
  const facts: [string, string | null][] = [["Team size", e.team_size], ["Duration", e.duration], ["Format", e.format], ["Date", e.event_date], ["Venue", e.venue], ["Fee", e.fee ? `₹${e.fee}` : "Free"]];
  return (
    <main className="mx-auto max-w-4xl px-6 pb-16 pt-28 md:pl-32">
      <Link href="/events" className="text-gold hover:underline">Back to events</Link>
      <p className="mt-6 text-gold">{e.subcategory ? `${e.category} · ${e.subcategory}` : e.category}{e.flagship && " · Flagship"}</p>
      <h1 className="font-display text-4xl font-black md:text-6xl">{e.name}</h1>
      <p className="mt-4 text-xl text-bone/85">{e.description}</p>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        {facts.filter(([, v]) => v).map(([k, v]) => (
          <div key={k} className="rounded-md border border-white/10 bg-white/5 p-4"><dt className="text-sm text-bone/60">{k}</dt><dd className="text-lg font-semibold">{v}</dd></div>
        ))}
      </dl>
      {e.components && <section className="mt-8"><h2 className="font-display text-2xl font-bold">What you can do</h2><p className="mt-2 text-bone/80">{e.components}</p></section>}
      {e.mumbai_angle && <section className="mt-8"><h2 className="font-display text-2xl font-bold">The Mumbai theme</h2><p className="mt-2 text-bone/80">{e.mumbai_angle}</p></section>}
      <section className="mt-10"><h2 className="mb-4 font-display text-2xl font-bold">Register</h2><RegisterForm eventId={e.id} isOpen={e.is_open} /></section>
    </main>
  );
}
