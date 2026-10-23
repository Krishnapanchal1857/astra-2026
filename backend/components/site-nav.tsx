"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, Trophy, Phone, LogIn, Instagram, Youtube, Facebook } from "lucide-react";
import { cn } from "@/lib/utils";

const side = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/events", label: "Events", Icon: CalendarDays },
  { href: "/#flagship", label: "Flagship", Icon: Trophy },
  { href: "/contact.html", label: "Contact", Icon: Phone },
];
export function SiteNav() {
  const path = usePathname();
  return (
    <>
      {/* top bar: desktop */}
      <header className="fixed inset-x-0 top-0 z-[300] flex items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="font-display text-2xl font-black tracking-widest text-bone drop-shadow">ASTRA<sup className="text-[10px]">™</sup></Link>
        <nav className="hidden gap-10 border-y border-white/20 bg-black/40 px-12 py-3 font-semibold uppercase tracking-[0.2em] backdrop-blur md:flex [clip-path:polygon(3%_0,97%_0,100%_100%,0_100%)]">
          <Link href="/event.html" className="hover:text-gold">Events</Link>
          {/* <Link href="/#flagship" className="hover:text-gold">Flagship</Link> */}
          <Link href="/sport.html" className="hover:text-gold">sports</Link>
          <Link href="/gaming.html" className="hover:text-gold">Games</Link>
          {/* <Link href="/sport.html" className="hover:text-gold">sports</Link> */}

          <Link href="/about.html" className="hover:text-gold">About</Link>
        </nav>
        <Link href="/admin" className="flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-4 py-2 text-sm font-bold uppercase tracking-wider backdrop-blur hover:bg-white/20">
          <LogIn size={16} /> <span className="max-sm:hidden">Admin</span>
        </Link>
      </header>
      {/* side rail on desktop, bottom tabs on mobile */}
      <aside className="fixed bottom-0 left-0 z-[300] flex w-full justify-around border-t border-white/10 bg-night/90 py-2 backdrop-blur md:bottom-auto md:left-5 md:top-1/2 md:w-[88px] md:-translate-y-1/2 md:flex-col md:gap-5 md:rounded-xl md:border md:py-5">
        {side.map(({ href, label, Icon }) => (
          <Link key={label} href={href} className={cn("flex flex-col items-center gap-1 text-[11px] font-semibold hover:text-gold", path === href && "text-gold")}>
            <Icon size={22} />{label}
          </Link>
        ))}
      </aside>
      <aside className="fixed right-4 top-1/2 z-[300] hidden -translate-y-1/2 flex-col gap-5 rounded-xl border border-white/10 bg-night/80 p-3 lg:flex">
        <a aria-label="Instagram" href="https://www.instagram.com/astrafest.sathaye/" className="hover:text-gold"><Instagram /></a>
        <a aria-label="YouTube" href="https://www.youtube.com/@SathayeCollegeAstra" className="hover:text-gold"><Youtube /></a>
        <a aria-label="Facebook" href="https://www.facebook.com/SathayeCollegeAstra/" className="hover:text-gold"><Facebook /></a>
      </aside>
    </>
  );
}
