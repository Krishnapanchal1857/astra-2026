"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import MetroHero from "@/components/ui/scroll-locked-video-hero";

// Plays once per browser session, on the home page only.
export function IntroLoader() {
  const path = usePathname();
  const [phase, setPhase] = useState<"show" | "fade" | "gone">("show");
  useEffect(() => { if (sessionStorage.getItem("astra_intro")) setPhase("gone"); }, []);
  if (path !== "/" || phase === "gone") return null;
  const done = () => {
    try { sessionStorage.setItem("astra_intro", "1"); } catch {}
    setPhase("fade"); setTimeout(() => setPhase("gone"), 700);
  };
  return (
    <div className="fixed inset-0 z-[1000] bg-black transition-opacity duration-700" style={{ opacity: phase === "fade" ? 0 : 1, pointerEvents: phase === "fade" ? "none" : "auto" }}>
      <MetroHero title="" tagline="Mumbai Meri Jaan" scrubDistance={2400} onComplete={done} />
    </div>
  );
}
