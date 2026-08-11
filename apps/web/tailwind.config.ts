import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          200: "#bcdaff",
          300: "#8ec2ff",
          400: "#589fff",
          500: "#2f78ff",
          600: "#1857f0",
          700: "#1444c4",
          800: "#173a9c",
          900: "#18337a",
          950: "#0f1f4a",
        },
        ink: {
          900: "#0b1220",
          800: "#121a2b",
          700: "#1c2740",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px -8px rgba(15, 23, 42, 0.15)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
