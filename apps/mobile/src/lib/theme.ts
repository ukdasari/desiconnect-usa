import { useColorScheme } from "react-native";

// Same palette as the website (apps/web/src/app/globals.css): peacock + marigold on a cool paper background.
const light = {
  background: "#f2f5f4",
  surface: "#ffffff",
  surface2: "#e8eeec",
  border: "#d3dcd9",
  text: "#132423",
  textMuted: "#4a5d5b",
  peacock: "#0e3b43",
  peacockSoft: "#dcebea",
  primary: "#e8890c",
  primaryStrong: "#b86a05",
  onPrimary: "#1b1206",
  haldi: "#fff1d6",
  danger: "#c2342d",
  dangerSoft: "#fbe7e5",
  success: "#1f7a52",
  successSoft: "#def2e7",
  selected: "#0e3b43",
  onSelected: "#ffffff",
};

const dark: typeof light = {
  background: "#0c1a1c",
  surface: "#122427",
  surface2: "#1a3135",
  border: "#29444a",
  text: "#e9f0ee",
  textMuted: "#a7bab7",
  peacock: "#0a2c32",
  peacockSoft: "#17373c",
  primary: "#f3a53a",
  primaryStrong: "#f7c37a",
  onPrimary: "#1b1206",
  haldi: "#3a2a0e",
  danger: "#ec6a61",
  dangerSoft: "#3c1816",
  success: "#5cc493",
  successSoft: "#133528",
  selected: "#f3a53a",
  onSelected: "#1b1206",
};

export type Palette = typeof light;

export function useTheme() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return { scheme, c: scheme === "dark" ? dark : light };
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const font = { display: { fontWeight: "800" as const, letterSpacing: -0.3 }, body: 16, small: 14, tiny: 12 } as const;
