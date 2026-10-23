"use client";
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const IMAGE = "/astra-hero.jpg";
// One photo, three depth slices: sky + letters (far), city (middle), harbour + Gateway (near).
// Each slice moves at its own speed with the same mouse-driven perspective/tilt as before.
const SLICES = [
  { speedX: 0.02, speedY: 0.02, speedZ: 0, rotation: 0.0, z: 1, mask: undefined as string | undefined },
  { speedX: 0.05, speedY: 0.03, speedZ: 0.1, rotation: 0.05, z: 2, mask: "linear-gradient(to bottom, transparent 28%, #000 48%)" },
  { speedX: 0.1, speedY: 0.05, speedZ: 0.2, rotation: 0.1, z: 3, mask: "linear-gradient(to bottom, transparent 56%, #000 72%)" },
];

interface Props { title?: string; className?: string; children?: React.ReactNode }

export function ParallaxHero({ title = "ASTRA", className, children }: Props) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      const x = e.clientX - window.innerWidth / 2;
      const y = e.clientY - window.innerHeight / 2;
      const rot = (x / (window.innerWidth / 2)) * 20;
      refs.current.forEach((el, i) => {
        if (!el) return;
        const s = SLICES[i];
        const side = e.clientX < window.innerWidth / 2 ? 1 : -1;
        const z = Math.abs(x) * 0.1 * side * -1;
        el.style.transform = `perspective(2300px) translateZ(${z * s.speedZ}px) rotateY(${rot * s.rotation}deg) translate3d(${-x * s.speedX}px, ${y * s.speedY}px, 0)`;
      });
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <section className={cn("relative h-[100svh] w-full overflow-hidden bg-gradient-to-b from-[#e0a860] via-[#7a4a2e] to-night md:bg-night", className)}>
      <h1 className="sr-only">{title}</h1>
      {SLICES.map((s, i) => (
        <div
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          aria-hidden
          className={cn("pointer-events-none absolute bg-no-repeat transition-transform duration-[450ms] ease-out",
            "inset-[-5%] bg-cover bg-center",
            "max-md:inset-0 max-md:bg-[length:100%_auto] max-md:bg-top",
            i > 0 && "max-md:hidden")}
          style={{ backgroundImage: `url(${IMAGE})`, zIndex: s.z, WebkitMaskImage: s.mask, maskImage: s.mask }}
        />
      ))}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[100] h-28 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="pointer-events-none absolute inset-0 z-[100] bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0)_65%,rgba(0,0,0,0.55))]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[150] h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
      {children}
    </section>
  );
}
export default ParallaxHero;
