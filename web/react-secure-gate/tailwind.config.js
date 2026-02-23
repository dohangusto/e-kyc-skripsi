import animate from "tailwindcss-animate";

const neutralScale = {
  50: "#EAEFEF",
  100: "#EAEFEF",
  200: "#BFC9D1",
  300: "#BFC9D1",
  400: "#BFC9D1",
  500: "#BFC9D1",
  600: "#25343F",
  700: "#25343F",
  800: "#25343F",
  900: "#25343F",
  950: "#25343F",
};

const accentScale = {
  50: "#EAEFEF",
  100: "#EAEFEF",
  200: "#BFC9D1",
  300: "#FF9B51",
  400: "#FF9B51",
  500: "#FF9B51",
  600: "#FF9B51",
  700: "#FF9B51",
  800: "#25343F",
  900: "#25343F",
  950: "#25343F",
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    colors: {
      inherit: "inherit",
      current: "currentColor",
      transparent: "transparent",
      black: "#25343F",
      white: "#EAEFEF",
      slate: neutralScale,
      gray: neutralScale,
      zinc: neutralScale,
      neutral: neutralScale,
      stone: neutralScale,
      blue: accentScale,
      indigo: accentScale,
      sky: accentScale,
      purple: accentScale,
      fuchsia: accentScale,
      emerald: accentScale,
      green: accentScale,
      amber: accentScale,
      orange: accentScale,
      red: accentScale,
      rose: accentScale,
      border: "hsl(var(--border))",
      input: "hsl(var(--input))",
      ring: "hsl(var(--ring))",
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      primary: {
        DEFAULT: "hsl(var(--primary))",
        foreground: "hsl(var(--primary-foreground))",
      },
      secondary: {
        DEFAULT: "hsl(var(--secondary))",
        foreground: "hsl(var(--secondary-foreground))",
      },
      destructive: {
        DEFAULT: "hsl(var(--destructive))",
        foreground: "hsl(var(--destructive-foreground))",
      },
      muted: {
        DEFAULT: "hsl(var(--muted))",
        foreground: "hsl(var(--muted-foreground))",
      },
      accent: {
        DEFAULT: "hsl(var(--accent))",
        foreground: "hsl(var(--accent-foreground))",
      },
      popover: {
        DEFAULT: "hsl(var(--popover))",
        foreground: "hsl(var(--popover-foreground))",
      },
      card: {
        DEFAULT: "hsl(var(--card))",
        foreground: "hsl(var(--card-foreground))",
      },
      chart: {
        1: "hsl(var(--chart-1))",
        2: "hsl(var(--chart-2))",
        3: "hsl(var(--chart-3))",
        4: "hsl(var(--chart-4))",
        5: "hsl(var(--chart-5))",
      },
    },
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [animate],
};
