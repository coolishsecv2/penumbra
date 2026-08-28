/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0b",
        foreground: "#e4e4e7",
        card: "#18181b",
        "card-hover": "#1f1f23",
        border: "#27272a",
        muted: "#71717a",
        accent: "#f97316",
        "accent-hover": "#fb923c",
        success: "#22c55e",
        warning: "#eab308",
        danger: "#ef4444",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
