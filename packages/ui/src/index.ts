// DesiConnect design tokens. The web app consumes the same values through tokens.css (CSS variables);
// the mobile app imports these objects directly. Keep both in sync.

export const palette = {
  marigold: { 50: "#FFF7EB", 100: "#FDEACB", 300: "#F7BF63", 500: "#E8890C", 600: "#C76F04", 700: "#9E5607" },
  peacock: { 50: "#EAF6F5", 100: "#C9E8E6", 300: "#6FBDB8", 500: "#0F7B76", 600: "#0B625E", 700: "#094C49" },
  kumkum: { 500: "#C2342D", 600: "#A2281F" },
  ink: { 50: "#F7F6F3", 100: "#ECEAE4", 200: "#D9D5CB", 400: "#9A9487", 600: "#5C574D", 800: "#2A2722", 900: "#17150F" },
  white: "#FFFFFF",
} as const;

export const colors = {
  light: {
    background: palette.ink[50],
    surface: palette.white,
    surfaceMuted: palette.ink[100],
    border: palette.ink[200],
    text: palette.ink[900],
    textMuted: palette.ink[600],
    primary: palette.marigold[500],
    primaryText: palette.ink[900],
    accent: palette.peacock[500],
    accentText: palette.white,
    danger: palette.kumkum[500],
    success: palette.peacock[600],
  },
  dark: {
    background: "#12110D",
    surface: "#1C1A15",
    surfaceMuted: "#26231C",
    border: "#3A362D",
    text: "#F3F0E8",
    textMuted: "#B1AB9C",
    primary: palette.marigold[300],
    primaryText: palette.ink[900],
    accent: palette.peacock[300],
    accentText: palette.ink[900],
    danger: "#E5625B",
    success: palette.peacock[300],
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColors = (typeof colors)[ColorScheme];

export const typography = {
  fontFamily: {
    display: "Fraunces",
    body: "Inter",
  },
  size: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, "2xl": 24, "3xl": 30, "4xl": 36, "5xl": 48 },
  weight: { regular: "400", medium: "500", semibold: "600", bold: "700" },
} as const;

export const spacing = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48, 16: 64 } as const;

export const radius = { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 } as const;

/** Accent color per category, used for icon tiles on web and mobile. */
export const categoryAccent: Record<string, string> = {
  events: "#C2342D",
  jobs: "#0F7B76",
  "real-estate": "#7A4FB5",
  insurance: "#2F6DB5",
  lawyers: "#5C574D",
  immigration: "#1F8A5B",
  shopping: "#D9488B",
  emergency: "#C2342D",
  healthcare: "#1C8FB0",
  food: "#E8890C",
  travel: "#3A7BD5",
  education: "#8A5A00",
  "home-services": "#556B2F",
  "finance-taxes": "#0B625E",
  community: "#B0532B",
};
