/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        pitwall: {
          bg: "#08080E",
          surface: "#0E0E18",
          "surface-2": "#13131F",
          border: "#1A1A2E",
          "border-bright": "#252540",
          accent: "#E8002D",
          yellow: "#FFF200",
          teal: "#00D2BE",
          muted: "#3A3A5C",
          "muted-2": "#5A5A7A",
          text: "#E8E8F0",
          "text-dim": "#9090B0",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Barlow Condensed'", "sans-serif"],
        orbitron: ["'Orbitron'", "monospace"],
      },
      animation: {
        marquee: "marquee 30s linear infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};