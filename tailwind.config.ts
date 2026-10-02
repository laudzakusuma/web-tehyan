import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: { seduh: "var(--seduh)", "seduh-soft": "var(--seduh-soft)", gading: "var(--gading)", kertas: "var(--kertas)", pasir: "var(--pasir)", daun: "var(--daun)", genteng: "var(--genteng)", "genteng-deep": "var(--genteng-deep)", arang: "var(--arang)" },
      fontFamily: { display: ["var(--font-fraunces)", "Georgia", "serif"], sans: ["var(--font-instrument)", "system-ui", "sans-serif"] },
      borderRadius: { field: "4px", card: "6px", panel: "12px" },
    },
  },
} satisfies Config;
