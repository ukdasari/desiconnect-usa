import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { CategoryDto, ListingSummaryDto } from "@desiconnect/contracts";
import { CategoryIcon, ListingCard } from "@/components/listing-card";
import { Body, Button, EmptyState, H2 } from "@/components/ui";
import { locationQuery, useLocation } from "@/lib/location";
import { space, useTheme } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

export default function HomeScreen() {
  const { c } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { location } = useLocation();
  const [q, setQ] = useState("");
  const near = { ...locationQuery(location), radiusMiles: 40 };
  const categories = useApi<CategoryDto[]>("/categories", { anonymous: true });
  const events = useApi<ListingSummaryDto[]>("/events", { query: { ...near, pageSize: 3 } }, [location.label]);
  const jobs = useApi<ListingSummaryDto[]>("/jobs", { query: { ...near, pageSize: 3, sort: "newest" } }, [location.label]);

  const refreshing = categories.refreshing || events.refreshing || jobs.refreshing;
  const search = () => router.push({ pathname: "/explore", params: { q } });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl, gap: space.xl }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { categories.reload(); events.reload(); jobs.reload(); }} />}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.hero, { backgroundColor: c.peacock, paddingTop: insets.top + space.lg }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Location: ${location.label}. Change location`} onPress={() => router.push("/location")} style={styles.locationChip}>
          <Ionicons name="location" size={16} color={c.primary} />
          <Text style={{ color: "#fff", fontWeight: "600" }}>{location.label}</Text>
          <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.7)" />
        </Pressable>
        <Text accessibilityRole="header" style={styles.heroTitle}>Find the people who get it.</Text>
        <View style={[styles.searchBox, { backgroundColor: c.surface }]}>
          <Ionicons name="search" size={20} color={c.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            onSubmitEditing={search}
            returnKeyType="search"
            placeholder="Tax preparer, tiffin, garba…"
            placeholderTextColor={c.textMuted}
            accessibilityLabel="Search DesiConnect"
            style={{ flex: 1, color: c.text, fontSize: 16, minHeight: 48 }}
          />
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push("/ai")} style={styles.aiLink}>
          <Ionicons name="sparkles" size={16} color={c.primary} />
          <Text style={{ color: "#fff", fontWeight: "600" }}>Or ask Desi AI in your own words</Text>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
        <H2>Browse</H2>
        <View style={styles.grid}>
          {(categories.data ?? []).map((cat) => (
            <Pressable
              key={cat.slug}
              accessibilityRole="button"
              accessibilityLabel={`${cat.name}, ${cat.listingCount} listed`}
              onPress={() => (cat.slug === "emergency" ? router.push("/emergency") : router.push({ pathname: "/explore", params: { category: cat.slug } }))}
              style={styles.tile}
            >
              <CategoryIcon icon={cat.icon} slug={cat.slug} size={52} />
              <Text style={{ color: c.text, fontSize: 12, fontWeight: "600", textAlign: "center" }} numberOfLines={2}>{cat.name}</Text>
            </Pressable>
          ))}
        </View>
        {categories.error ? <Body muted>{categories.error}</Body> : null}
      </View>

      <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
        <H2 action={<Button title="All" variant="ghost" onPress={() => router.push({ pathname: "/explore", params: { section: "EVENT" } })} />}>Coming up near you</H2>
        {events.data?.length ? events.data.map((e) => <ListingCard key={e.id} item={e} />) : !events.loading ? <EmptyState title="No upcoming events nearby yet" /> : null}
      </View>

      <View style={{ paddingHorizontal: space.lg, gap: space.md }}>
        <H2 action={<Button title="All" variant="ghost" onPress={() => router.push({ pathname: "/explore", params: { section: "JOB" } })} />}>New jobs</H2>
        {jobs.data?.length ? jobs.data.map((j) => <ListingCard key={j.id} item={j} />) : !jobs.loading ? <EmptyState title="No jobs posted near you yet" /> : null}
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel="Emergency: call 911" onPress={() => Linking.openURL("tel:911")} style={[styles.emergency, { borderColor: c.danger, backgroundColor: c.dangerSoft }]}>
        <Ionicons name="call" size={20} color={c.danger} />
        <Text style={{ color: c.text, flex: 1, fontWeight: "600" }}>In danger? Call 911. In crisis? Call or text 988.</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: space.lg, paddingBottom: space.xl, gap: space.md, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  locationChip: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },
  heroTitle: { color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -0.4, lineHeight: 34 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 16, paddingHorizontal: 14 },
  aiLink: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36 },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: space.lg },
  tile: { width: "20%", alignItems: "center", gap: 6, minHeight: 88 },
  emergency: { marginHorizontal: space.lg, flexDirection: "row", gap: 12, alignItems: "center", borderWidth: 1, borderRadius: 16, padding: 16 },
});
