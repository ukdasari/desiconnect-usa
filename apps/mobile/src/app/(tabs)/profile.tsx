import { StyleSheet, Text, View } from "react-native";
import { API_URL } from "@/lib/api";
import { useTheme } from "@/lib/theme";

// Shell screen: account sign-in (secure token storage via expo-secure-store), request history and
// provider tools are built in the mobile phase (Prompt 3) against the same API endpoints as the web.
export default function ProfileScreen() {
  const { c } = useTheme();
  return (
    <View style={styles.page}>
      <Text style={[styles.h1, { color: c.text }]}>Profile</Text>
      <Text style={{ color: c.textMuted }}>Account sign-in, requests and provider tools arrive in the next mobile release.</Text>
      <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 16 }}>Connected to {API_URL}</Text>
    </View>
  );
}

const styles = StyleSheet.create({ page: { flex: 1, padding: 20, gap: 8 }, h1: { fontSize: 24, fontWeight: "800" } });
