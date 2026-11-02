import { Link } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { CategoryDto } from "@desiconnect/contracts";
import { categoryAccent } from "@desiconnect/ui";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/theme";

export default function HomeScreen() {
  const { c } = useTheme();
  const [categories, setCategories] = useState<CategoryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<CategoryDto[]>("/categories").then((r) => setCategories(r.data)).catch((e: Error) => setError(e.message));
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={[styles.hero, { backgroundColor: c.peacock }]}>
        <Text style={styles.heroTitle}>Find the people who get it.</Text>
        <Text style={styles.heroBody}>Services, events, jobs and homes from the Desi community, starting in Dallas–Fort Worth.</Text>
        <Link href="/explore" asChild>
          <Pressable accessibilityRole="button" style={[styles.cta, { backgroundColor: c.primary }]}>
            <Text style={styles.ctaText}>Search listings</Text>
          </Pressable>
        </Link>
      </View>

      <Text style={[styles.h2, { color: c.text }]}>Browse by what you need</Text>
      {error ? <Text style={{ color: c.danger }}>Couldn&apos;t load categories: {error}</Text> : null}
      {!categories && !error ? <ActivityIndicator color={c.primary} /> : null}
      <View style={styles.grid}>
        {categories?.map((cat) => (
          <Link key={cat.slug} href={{ pathname: "/explore", params: { category: cat.slug } }} asChild>
            <Pressable accessibilityRole="link" style={[styles.tile, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={[styles.dot, { backgroundColor: categoryAccent[cat.slug] ?? c.primary }]} />
              <Text style={[styles.tileName, { color: c.text }]}>{cat.name}</Text>
              <Text style={{ color: c.textMuted, fontSize: 12 }}>{cat.slug === "emergency" ? "911 and 988" : `${cat.listingCount} listed`}</Text>
            </Pressable>
          </Link>
        ))}
      </View>

      <Pressable accessibilityRole="button" onPress={() => Linking.openURL("tel:911")} style={[styles.emergency, { borderColor: c.danger }]}>
        <Text style={{ color: c.danger, fontWeight: "700" }}>In danger? Call 911. In crisis? Call or text 988.</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, gap: 16 },
  hero: { borderRadius: 20, padding: 20, gap: 10 },
  heroTitle: { color: "#fff", fontSize: 28, fontWeight: "800" },
  heroBody: { color: "rgba(255,255,255,0.85)", fontSize: 15 },
  cta: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10, marginTop: 4 },
  ctaText: { color: "#1b1206", fontWeight: "700" },
  h2: { fontSize: 20, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "48%", borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  tileName: { fontWeight: "700" },
  emergency: { borderWidth: 1, borderRadius: 14, padding: 14 },
});
