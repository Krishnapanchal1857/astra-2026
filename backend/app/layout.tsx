import type { Metadata, Viewport } from "next";
import { Cinzel, Rajdhani } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { IntroLoader } from "@/components/intro-loader";
const display = Cinzel({ subsets: ["latin"], weight: ["700", "900"], variable: "--font-display" });
const ui = Rajdhani({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-ui" });
export const metadata: Metadata = { title: "ASTRA 2026 · Mumbai Meri Jaan", description: "Sathaye College's annual festival. Browse events and register your team." };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body className={`${display.variable} ${ui.variable}`}>
      <IntroLoader />
      <SiteNav />
      <div className="pb-20 md:pb-0">{children}</div>
    </body></html>
  );
}
