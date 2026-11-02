import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ListingSummaryDto } from "@desiconnect/contracts";
import { categoryAccent } from "@desiconnect/ui";
import { api } from "@/lib/api";
import { dateParts, enumText, formatEventWhen, priceLine } from "@/lib/format";
import { useRequireAuth } from "@/lib/require-auth";
import { useTheme } from "@/lib/theme";
import { Badge, type IconName } from "./ui";

export const CATEGORY_ICONS: Record<string, IconName> = {
  "calendar-heart": "calendar-outline",
  briefcase: "briefcase-outline",
  home: "home-outline",
  "shield-check": "shield-checkmark-outline",
  scale: "scale-outline",
  "plane-landing": "airplane-outline",
  "shopping-bag": "bag-handle-outline",
  siren: "alert-circle-outline",
  stethoscope: "medkit-outline",
  utensils: "restaurant-outline",
  plane: "airplane-outline",
  "graduation-cap": "school-outline",
  wrench: "construct-outline",
  landmark: "cash-outline",
  users: "people-outline",
};

export function CategoryIcon({ icon, slug, size = 44 }: { icon: string; slug: string; size?: number }) {
  const color = categoryAccent[slug] ?? "#15525c";
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: `${color}22`, alignItems: "center", justifyContent: "center" }} accessibilityElementsHidden importantForAccessibility="no">
      <Ionicons name={CATEGORY_ICONS[icon] ?? "ellipse-outline"} size={size * 0.48} color={color} />
    </View>
  );
}

export function DateBlock({ iso }: { iso: string }) {
  const { c } = useTheme();
  const d = dateParts(iso);
  return (
    <View style={[styles.date, { borderColor: c.border, backgroundColor: c.surface }]} accessibilityElementsHidden importantForAccessibility="no">
      <Text style={{ backgroundColor: c.danger, color: "#fff", fontSize: 11, fontWeight: "800", textAlign: "center", paddingVertical: 2 }}>{d.month}</Text>
      <Text style={{ color: c.text, fontSize: 22, fontWeight: "800", textAlign: "center" }}>{d.day}</Text>
    </View>
  );
}

export function SaveButton({ listing, onChange }: { listing: Pick<ListingSummaryDto, "id" | "title" | "isFavorite">; onChange?: (on: boolean) => void }) {
  const { c } = useTheme();
  const requireAuth = useRequireAuth();
  const [on, setOn] = useState(!!listing.isFavorite);
  const [busy, setBusy] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={on ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}
      accessibilityState={{ selected: on, busy }}
      hitSlop={10}
      style={styles.save}
      onPress={() =>
        requireAuth(async () => {
          const next = !on;
          setOn(next); // optimistic
          setBusy(true);
          try {
            await api(`/me/favorites/${listing.id}`, { method: next ? "POST" : "DELETE" });
            onChange?.(next);
          } catch {
            setOn(!next);
          } finally {
            setBusy(false);
          }
        }, "Sign in to save listings.")
      }
    >
      <Ionicons name={on ? "heart" : "heart-outline"} size={24} color={on ? c.danger : c.textMuted} />
    </Pressable>
  );
}

export function ListingCard({ item, onUnsave }: { item: ListingSummaryDto; onUnsave?: () => void }) {
  const { c } = useTheme();
  const router = useRouter();
  const where = item.job?.workArrangement === "REMOTE" ? "Remote" : `${item.location.city}, ${item.location.state}`;
  const detail = item.event
    ? formatEventWhen(item.event.startAt, item.event.endAt)
    : item.job
      ? `${item.job.company} · ${enumText(item.job.employmentType)}`
      : item.property
        ? [item.property.beds !== null ? `${item.property.beds} bd` : null, item.property.baths !== null ? `${item.property.baths} ba` : null].filter(Boolean).join(" · ")
        : item.provider?.businessName;
  const price = priceLine(item);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${item.title}. ${where}.${price ? ` ${price}.` : ""}${item.isDemo ? " Demo listing." : ""}`}
      onPress={() => router.push({ pathname: "/listing/[slug]", params: { slug: item.slug } })}
      style={({ pressed }) => [styles.card, { backgroundColor: c.surface, borderColor: c.border, opacity: pressed ? 0.9 : 1 }]}
    >
      {item.event ? <DateBlock iso={item.event.startAt} /> : <CategoryIcon icon={item.category.icon} slug={item.category.slug} />}
      <View style={{ flex: 1, gap: 4 }}>
        <View style={styles.badges}>
          {item.provider?.verification === "VERIFIED" ? <Badge label="Verified" tone="success" icon="checkmark-circle" /> : null}
          {item.isDemo ? <Badge label="Demo" /> : null}
          <Text style={{ color: c.textMuted, fontSize: 12 }}>{item.subcategory?.name ?? item.category.name}</Text>
        </View>
        <Text style={{ color: c.text, fontSize: 16, fontWeight: "700", lineHeight: 21 }}>{item.title}</Text>
        {detail ? <Text style={{ color: c.textMuted, fontSize: 14 }} numberOfLines={1}>{detail}</Text> : null}
        <Text style={{ color: c.textMuted, fontSize: 13 }}>
          {where}
          {item.distanceMiles !== null ? ` (${item.distanceMiles} mi)` : ""}
          {item.languages.length ? `  ·  ${item.languages.slice(0, 3).join(", ")}` : ""}
        </Text>
        {price ? <Text style={{ color: c.text, fontWeight: "700", fontSize: 14 }}>{price}</Text> : null}
      </View>
      <SaveButton listing={item} onChange={(on) => !on && onUnsave?.()} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: 12, padding: 14, borderWidth: 1, borderRadius: 18, alignItems: "flex-start" },
  badges: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
  date: { width: 48, borderWidth: 1, borderRadius: 12, overflow: "hidden", paddingBottom: 4 },
  save: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginTop: -8, marginRight: -8 },
});
