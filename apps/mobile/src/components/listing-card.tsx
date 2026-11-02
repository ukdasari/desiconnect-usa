import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ListingSummaryDto } from "@desiconnect/contracts";
import { useTheme } from "@/lib/theme";

export function ListingCard({ item }: { item: ListingSummaryDto }) {
  const { c } = useTheme();
  return (
    <Link href={{ pathname: "/listing/[slug]", params: { slug: item.slug } }} asChild>
      <Pressable accessibilityRole="link" style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
        <View style={styles.row}>
          {item.provider?.verification === "VERIFIED" ? <Text style={[styles.badge, { color: c.success }]}>Verified</Text> : null}
          {item.isDemo ? <Text style={[styles.badge, { color: c.textMuted }]}>Demo</Text> : null}
          <Text style={[styles.badge, { color: c.textMuted }]}>{item.subcategory?.name ?? item.category.name}</Text>
        </View>
        <Text style={[styles.title, { color: c.text }]}>{item.title}</Text>
        <Text style={{ color: c.textMuted }}>
          {item.location.city}, {item.location.state}
          {item.distanceMiles !== null ? ` (${item.distanceMiles} mi)` : ""}
          {item.languages.length ? `  ·  ${item.languages.slice(0, 3).join(", ")}` : ""}
        </Text>
        {item.priceText ? <Text style={[styles.price, { color: c.text }]}>{item.priceText}</Text> : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 4 },
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  badge: { fontSize: 12, fontWeight: "600" },
  title: { fontSize: 17, fontWeight: "700" },
  price: { fontWeight: "600", marginTop: 2 },
});
