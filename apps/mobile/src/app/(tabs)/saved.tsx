import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/lib/theme";

// Shell screen: saved listings require mobile sign-in, which is part of the mobile build phase (Prompt 3).
export default function SavedScreen() {
  const { c } = useTheme();
  return (
    <View style={styles.page}>
      <Text style={[styles.h1, { color: c.text }]}>Saved</Text>
      <Text style={{ color: c.textMuted }}>Sign in on mobile is coming next. Until then, save listings on the website and they&apos;ll appear here once your account is connected.</Text>
    </View>
  );
}

const styles = StyleSheet.create({ page: { flex: 1, padding: 20, gap: 8 }, h1: { fontSize: 24, fontWeight: "800" } });
