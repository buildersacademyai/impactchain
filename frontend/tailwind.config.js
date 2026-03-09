/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand:   "#00B4D8",
        surface: "#0d1829",
        border:  "#1e2d3d",
        muted:   "#64748b",
        dim:     "#475569",
        dark:    "#080c12",
      },
      fontFamily: {
        mono: ["'DM Mono'", "monospace"],
        sans: ["'DM Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
};