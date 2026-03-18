import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  // Safelist provider colors used via dynamic class construction
  safelist: ["bg-claude", "bg-codex", "bg-copilot"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        label: "hsl(var(--label))",
        claude: "hsl(var(--claude))",
        codex: "hsl(var(--codex))",
        copilot: "hsl(var(--copilot))",
        alert: "hsl(var(--alert))",
        nominal: "hsl(var(--nominal))",
      },
      borderRadius: {
        lg: "0px",
        md: "0px",
        sm: "0px",
      },
    },
  },
  plugins: [],
} satisfies Config;
