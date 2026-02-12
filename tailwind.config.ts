import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#FAF5FF",
          100: "#F3E8FF",
          200: "#E9D5FF",
          300: "#D8B4FE",
          400: "#C4B5FD",
          500: "#A78BFA",
          600: "#8B5CF6",
          700: "#7C3AED",
          800: "#6D28D9",
          900: "#5B21B6",
        },
        priority: {
          high: "#FCA5A5",
          medium: "#FCD34D",
          low: "#86EFAC",
        },
        dark: {
          bg: "#1A1A1A",
          card: "#2D2D2D",
          border: "#404040",
          text: "#E5E5E5",
        },
      },
      borderRadius: {
        claude: "12px",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
export default config;
