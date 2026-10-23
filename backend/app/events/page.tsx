import { EventsBrowser } from "@/components/events-browser";
import { getEvents } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function EventsPage({ searchParams }: { searchParams: { cat?: string } }) {
  const events = await getEvents();
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 pb-16 pt-28 md:pl-32">
      <h1 className="font-display text-4xl font-black md:text-6xl">Events</h1>
      <p className="mt-2 text-bone/70">Choose an event to see the rules and register your team.</p>
      <EventsBrowser events={events} initialCat={searchParams.cat ?? "All"} />
    </main>
  );
}
