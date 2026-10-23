"use client";
import { useEffect, useRef, useState } from "react";

export interface MetroHeroProps {
  videoSrc?: string;
  title?: string;
  scrollHint?: string;
  tagline?: string;
  /** Total input distance (px) needed to scrub the full video. */
  scrubDistance?: number;
  /** Called shortly after the video reaches its end, or when the visitor skips. */
  onComplete?: () => void;
  /** Off by default: the video only moves when the visitor scrolls or swipes. */
  autoplay?: boolean;
  className?: string;
}
const COL_TEXT = "#f2f4f8";
const SANS = "var(--font-display), serif";
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export default function MetroHero({
  videoSrc = "/metro_astra.mp4", title = "THE CITY OPENS", scrollHint = "SCROLL",
  tagline = "Every door in the city is already open.", scrubDistance = 100, onComplete, autoplay = true, className,
}: MetroHeroProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onComplete);
  doneRef.current = onComplete;
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current, section = sectionRef.current;
    if (!video || !section) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const AUTOPLAY_DURATION = 7; // seconds — how long the full intro lasts
    let duration = 0, raf = 0, target = 0, current = 0, started = false, seeking = false, pending: number | null = null;
    let autoplayClock = 0; // virtual clock for timed autoplay (0→1 over AUTOPLAY_DURATION s)
    let touchY = 0, userTouched = false, last = performance.now(), completed = false, timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (delay: number) => { if (completed) return; completed = true; timer = setTimeout(() => doneRef.current?.(), delay); };

    const onLoaded = () => { if (!video.duration) return; duration = video.duration; setReady(true); if (reduce) finish(400); };
    ["loadedmetadata", "loadeddata", "canplay"].forEach((ev) => video.addEventListener(ev, onLoaded));
    // Never trap the visitor: if the video fails or is very slow, open the site.
    const onError = () => { console.error("Intro video failed to load:", video.error?.message, videoSrc); setFailed(true); finish(8000); };
    video.addEventListener("error", onError);
    const giveUp = setTimeout(() => { if (!video.duration) { setFailed(true); finish(8000); } }, 10);
    // iOS won't buffer a never-played video, so start and immediately pause it once.
    // Listeners are attached first, so no load event can be missed (the <video> starts loading
    // during server render, before React hydrates). Then play normally as the starting animation.
    let playing = false, playFailed = false;
    video.load();
    const p = video.play();
    if (p?.then) p.then(() => { if (autoplay && !userTouched) { playing = true; started = true; } else { video.pause(); video.currentTime = 0; } }).catch(() => { playFailed = true; });
    else video.pause();

    const onSeeked = () => { seeking = false; if (pending !== null) { const t = pending; pending = null; seeking = true; video.currentTime = t; } };
    video.addEventListener("seeked", onSeeked);
    const seekTo = (t: number) => { if (seeking) { pending = t; return; } seeking = true; video.currentTime = t; };

    // Pin the page while the intro plays; released on unmount.
    const y0 = window.scrollY, b = document.body.style;
    Object.assign(b, { position: "fixed", top: `-${y0}px`, left: "0", right: "0", width: "100%", height: "100%", overscrollBehavior: "none" });

    const add = (d: number) => { userTouched = true; if (playing) { video.pause(); playing = false; if (video.duration) target = current = video.currentTime / video.duration; } target = clamp(target + d / scrubDistance, 0, 1); if (target > 0.001) started = true; };
    const onWheel = (e: WheelEvent) => { add(e.deltaY); e.preventDefault(); };
    const onTS = (e: TouchEvent) => { touchY = e.touches[0]?.clientY ?? 0; };
    const onTM = (e: TouchEvent) => { const y = e.touches[0]?.clientY ?? touchY; add(touchY - y); touchY = y; e.preventDefault(); };
    const onKey = (e: KeyboardEvent) => { if (["ArrowDown", "PageDown", " "].includes(e.key)) add(400); if (["ArrowUp", "PageUp"].includes(e.key)) add(-400); };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    section.addEventListener("touchstart", onTS, { passive: true });
    section.addEventListener("touchmove", onTM, { passive: false });

    const frame = () => {
      const now = performance.now(), dt = (now - last) / 1000; last = now;
      if (!duration && video.duration) { duration = video.duration; setReady(true); }
      if (playing && !userTouched && duration > 0) {
        // Drive progress via a fixed-duration virtual clock so the intro always takes AUTOPLAY_DURATION seconds
        autoplayClock = Math.min(1, autoplayClock + Math.min(dt, 0.1) / AUTOPLAY_DURATION);
        target = current = autoplayClock;
        // Keep the video frame in sync with the virtual clock
        const desiredTime = autoplayClock * duration;
        if (Math.abs(video.currentTime - desiredTime) > 0.15) seekTo(desiredTime);
      }
      else if (autoplay && playFailed && !userTouched && duration > 0) {
        autoplayClock = Math.min(1, autoplayClock + Math.min(dt, 0.1) / AUTOPLAY_DURATION);
        target = autoplayClock; started = true;
      }
      current += (target - current) * 0.18;
      if (duration > 0 && !playing) seekTo(current * duration);
      video.style.transform = `scale(${1 + current * 0.06})`;
      if (titleRef.current) {
        const t = 1 - clamp(current / 0.35, 0, 1), s = titleRef.current.style;
        s.opacity = String(t); s.transform = `translateY(${(1 - t) * -24}px) scale(${0.96 + t * 0.04})`; s.filter = `blur(${(1 - t) * 10}px)`;
      }
      if (hintRef.current) hintRef.current.style.opacity = started ? "0" : "1";
      if (taglineRef.current) {
        const t = clamp((current - 0.82) / 0.18, 0, 1), s = taglineRef.current.style;
        s.opacity = String(t); s.transform = `translateY(${(1 - t) * 20}px) scale(${0.97 + t * 0.03})`; s.filter = `blur(${(1 - t) * 8}px)`;
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${current})`;
      if (current > 0.995 || (playing && video.ended)) finish(1500);   // let the tagline land, then reveal the site
      raf = requestAnimationFrame(frame);
    };
    if (!reduce) raf = requestAnimationFrame(frame);

    return () => {
      clearTimeout(timer); cancelAnimationFrame(raf);
      ["loadedmetadata", "loadeddata", "canplay"].forEach((ev) => video.removeEventListener(ev, onLoaded)); video.removeEventListener("error", onError); clearTimeout(giveUp); video.removeEventListener("seeked", onSeeked);
      window.removeEventListener("wheel", onWheel); window.removeEventListener("keydown", onKey);
      section.removeEventListener("touchstart", onTS); section.removeEventListener("touchmove", onTM);
      Object.assign(b, { position: "", top: "", left: "", right: "", width: "", height: "", overscrollBehavior: "" });
      window.scrollTo(0, y0);
    };
  }, [scrubDistance, autoplay]);

  const center = "absolute inset-0 flex items-center justify-center px-[6%] text-center pointer-events-none";
  return (
    <div ref={sectionRef} className={className} style={{ position: "relative", height: "100dvh", width: "100%", overflow: "hidden", background: "#05070d", touchAction: "none" }}>
      <video ref={videoRef} src={videoSrc} muted playsInline preload="auto"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: ready ? 1 : 0, willChange: "transform", transition: "opacity .6s ease", pointerEvents: "none" }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(5,7,13,.35), rgba(5,7,13,0) 30%, rgba(5,7,13,.15) 70%, rgba(5,7,13,.55))" }} />
      <div ref={titleRef} className={center}>
        <span style={{ fontFamily: SANS, fontWeight: 900, fontSize: "clamp(34px, 8vw, 104px)", lineHeight: 1, color: COL_TEXT, textShadow: "0 4px 30px rgba(0,0,0,.5)" }}>{title}</span>
      </div>
      <div ref={taglineRef} className={center} style={{ opacity: 0 }}>
        <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: "clamp(20px, 3.4vw, 40px)", lineHeight: 1.2, color: COL_TEXT, textShadow: "0 4px 24px rgba(0,0,0,.5)" }}>{tagline}</span>
      </div>
      <div ref={hintRef} className="pointer-events-none absolute bottom-[clamp(20px,6vh,48px)] left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-xs font-semibold tracking-[0.3em] text-white/75 transition-opacity">
        <span>{scrollHint}</span>
        <svg width="14" height="18" viewBox="0 0 14 18" className="animate-bounce"><path d="M7 1V17M2 12L7 17L12 12" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
      {failed && <p className="absolute inset-x-0 bottom-24 text-center text-sm text-white/70">Intro video could not be loaded. Opening the site…</p>}
      <button onClick={() => doneRef.current?.()} className="absolute right-4 top-4 z-10 rounded-md border border-white/30 bg-black/30 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white backdrop-blur hover:bg-white/20">Skip intro</button>
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-white/10"><div ref={barRef} className="h-full w-full origin-left bg-white/90" style={{ transform: "scaleX(0)" }} /></div>
    </div>
  );
}
