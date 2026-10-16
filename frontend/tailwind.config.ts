import type { Config } from "tailwindcss";

/**
 * Semua warna/radius/bayangan menunjuk token di app/globals.css.
 * Jangan menaruh hex mentah di sini maupun di komponen.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
      colors: {
        paper: "var(--paper)",
        "paper-soft": "var(--paper-soft)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--ink)",
        muted: "var(--ink-muted)",
        faint: "var(--ink-faint)",
        line: "var(--line)",
        "line-strong": "var(--line-strong)",
        accent: "var(--accent)",
        "accent-deep": "var(--accent-deep)",
        "accent-soft": "var(--accent-soft)",
        "accent-bg": "var(--accent-bg)",
      },
      borderRadius: {
        card: "var(--r-card)",
        panel: "var(--r-panel)",
        ctl: "var(--r-ctl)",
      },
      maxWidth: {
        shell: "var(--shell)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        float: "var(--shadow-float)",
      },
    },
  },
  plugins: [],
};

export default config;
