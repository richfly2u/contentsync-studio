import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "#ffffff",
          dark: "#0f0f0f",
        },
        card: {
          DEFAULT: "#ffffff",
          dark: "#1a1a2e",
        },
        muted: {
          DEFAULT: "#f5f5f5",
          dark: "#161616",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
