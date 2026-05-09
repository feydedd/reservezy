import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "rz-bg": "#09091a",
        "rz-card": "#13132c",
        "rz-elevated": "#0f0f28",
        "rz-text": "#eef0f8",
        "rz-muted": "#9aa3c2",
        "rz-subtle": "#6b7499",
        "rz-accent": "#8b86f9",
        "rz-accent-deep": "#6d66f0",
        /* legacy */
        slot: {
          bg: "#09091a",
          card: "#13132c",
          elevated: "#0f0f28",
          accent: "#8b86f9",
          "accent-deep": "#6d66f0",
          muted: "#9aa3c2",
          subtle: "#6b7499",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      fontSize: {
        "2xs": ["0.65rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        "rz-glow": "0 0 32px rgba(139,134,249,0.32), 0 8px 32px rgba(0,0,0,0.4)",
        "rz-soft": "0 0 20px rgba(139,134,249,0.18), 0 4px 16px rgba(0,0,0,0.3)",
        "rz-card": "0 4px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(139,134,249,0.12)",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
