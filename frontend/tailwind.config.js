/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        pitwall: {
          bg: "#0A0A0F",
          surface: "#12121A",
          border: "#1E1E2E",
          accent: "#E8002D",
          yellow: "#FFF200",
          muted: "#4A4A6A",
          text: "#E8E8F0",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Barlow Condensed'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
