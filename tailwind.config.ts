import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f5f7ff",
          100: "#e8ecff",
          600: "#3b5bfd",
          700: "#2f48c7",
          900: "#121a46"
        }
      }
    }
  },
  plugins: []
};

export default config;