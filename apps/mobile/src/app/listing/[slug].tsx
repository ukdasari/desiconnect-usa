import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { REGULATED_DISCLAIMER, type ListingDetailDto } from "@desiconnect/contracts";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/theme";

export default function ListingScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { c } = useTheme();
  const [l, setL] = useState<ListingDetailDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<ListingDetailDto>(`/listings/${encodeURIComponent(slug)}`).then((r) => setL(r.data)).catch((e: Error) => setError(e.message));
  }, [slug]);

  if (error) return <Text style={{ color: c.danger, padding: 20 }}>{error}</Text>;
  if (!l) return <ActivityIndicator style={{ marginTop: 40 }} color={c.primary} />;
  return (
    <ScrollView contentContainerStyle={styles.page}>
      {l.isDemo ? <Text style={[styles.demo, { color: c.textMuted, borderColor: c.border }]}>Demonstration listing: not a real business.</Text> : null}
      <Text style={[styles.h1, { color: c.text }]}>{l.title}</Text>
      {l.provider ? <Text style={{ color: c.textMuted }}>{l.provider.businessName}{l.provider.verification === "VERIFIED" ? "  ·  Verified" : ""}</Text> : null}
      <Text style={{ color: c.textMuted }}>{l.location.city}, {l.location.state}{l.languages.length ? `  ·  ${l.languages.join(", ")}` : ""}</Text>
      {l.priceText ? <Text style={{ color: c.text, fontWeight: "700" }}>{l.priceText}</Text> : null}
      <Text style={{ color: c.text, lineHeight: 22, marginTop: 8 }}>{l.description}</Text>
      {l.regulated ? <Text style={{ color: c.textMuted, fontSize: 13, marginTop: 8 }}>{REGULATED_DISCLAIMER}</Text> : null}
      {l.contactPhone ? (
        <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`tel:${l.contactPhone}`)} style={[styles.cta, { backgroundColor: c.primary }]}>
          <Text style={{ fontWeight: "800", color: "#1b1206" }}>Call {l.contactPhone}</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 6 },
  h1: { fontSize: 24, fontWeight: "800" },
  demo: { borderWidth: 1, borderStyle: "dashed", borderRadius: 10, padding: 10, marginBottom: 8 },
  cta: { marginTop: 16, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
});
