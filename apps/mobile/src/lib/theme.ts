import { useColorScheme } from "react-native";
import { colors, radius, spacing, typography } from "@desiconnect/ui";

// Mobile palette: shared tokens, with the website's peacock/marigold accents.
const brand = {
  light: { ...colors.light, background: "#f2f5f4", peacock: "#0e3b43", primary: "#e8890c", text: "#132423", textMuted: "#4a5d5b", danger: "#c2342d" },
  dark: { ...colors.dark, background: "#0c1a1c", surface: "#122427", peacock: "#0a2c32", primary: "#f3a53a", text: "#e9f0ee", textMuted: "#a7bab7", danger: "#ec6a61" },
};

export function useTheme() {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  return { scheme, c: brand[scheme], radius, spacing, type: typography };
}
