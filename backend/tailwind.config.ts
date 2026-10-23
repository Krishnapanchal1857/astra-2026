import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { sky: { 1900: "#150d1f", 1700: "#5a2f2a" }, night: "#0d0a14", ember: "#ff7a2f", gold: "#e8c27a", glow: "#4fb6ff", bone: "#f1e8d8" },
    fontFamily: { display: ["var(--font-display)", "serif"], ui: ["var(--font-ui)", "sans-serif"] },
  } },
  plugins: [],
} satisfies Config;
