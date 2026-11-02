import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { CATEGORIES, LANGUAGES, getCategory, type ListingKind, type ListingSummaryDto } from "@desiconnect/contracts";
import { ListingCard } from "@/components/listing-card";
import { Body, Chip, EmptyState, ErrorState } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { locationQuery, useLocation } from "@/lib/location";
import { space, useTheme } from "@/lib/theme";

const SECTIONS: { kind: ListingKind | null; label: string }[] = [
  { kind: null, label: "All" },
  { kind: "SERVICE", label: "Services" },
  { kind: "EVENT", label: "Events" },
  { kind: "JOB", label: "Jobs" },
  { kind: "PROPERTY", label: "Homes" },
];
const RADII = [10, 25, 40, 100];
const PAGE = 15;

export default function Explore() {
  const { c } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ q?: string; category?: string; section?: string }>();
  const { location } = useLocation();

  const [q, setQ] = useState(params.q ?? "");
  const [submittedQ, setSubmittedQ] = useState(params.q ?? "");
  const [category, setCategory] = useState(params.category ?? "");
  const [kind, setKind] = useState<ListingKind | null>((params.section as ListingKind) ?? null);
  const [language, setLanguage] = useState<string | null>(null);
  const [radius, setRadius] = useState(40);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [rentOnly, setRentOnly] = useState(false);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [items, setItems] = useState<ListingSummaryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  // Deep links from Home (category / section / query) update the screen.
  useEffect(() => {
    if (params.category !== undefined) setCategory(params.category);
    if (params.section !== undefined) setKind((params.section as ListingKind) || null);
    if (params.q !== undefined) {
      setQ(params.q);
      setSubmittedQ(params.q);
    }
  }, [params.category, params.section, params.q]);

  const top = getCategory(category);
  const effectiveKind = kind ?? top?.kind ?? null;
  useLayoutEffect(() => {
    navigation.setOptions({ title: top && top.slug === category ? top.name : top?.subcategories.find((s) => s.slug === category)?.name ?? "Explore" });
  }, [navigation, top, category]);

  const load = useCallback(
    async (nextPage: number) => {
      const id = ++requestId.current;
      if (nextPage === 1) setLoading(true);
      else setMore(true);
      setError(null);
      try {
        const res = await api<ListingSummaryDto[]>("/search", {
          query: {
            q: submittedQ || undefined,
            category: category || undefined,
            kind: kind ?? undefined,
            ...locationQuery(location),
            radiusMiles: radius,
            language: language ?? undefined,
            verifiedOnly: verifiedOnly ? "true" : undefined,
            transactionType: rentOnly ? "RENT" : undefined,
            workArrangement: remoteOnly ? "REMOTE" : undefined,
            page: nextPage,
            pageSize: PAGE,
          },
        });
        if (id !== requestId.current) return;
        setItems((prev) => (nextPage === 1 ? res.data : [...prev, ...res.data]));
        setTotal(Number(res.meta?.total ?? res.data.length));
        setNote((res.meta?.locationNote as string | null) ?? null);
        setPage(nextPage);
      } catch (e) {
        if (id === requestId.current) setError(errorMessage(e));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setMore(false);
        }
      }
    },
    [submittedQ, category, kind, location, radius, language, verifiedOnly, rentOnly, remoteOnly],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const activeFilters = [language, verifiedOnly, rentOnly, remoteOnly, radius !== 40].filter(Boolean).length;

  const header = (
    <View style={{ gap: space.md, paddingBottom: space.sm }}>
      <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Ionicons name="search" size={18} color={c.textMuted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          onSubmitEditing={() => setSubmittedQ(q.trim())}
          returnKeyType="search"
          placeholder="Search listings"
          placeholderTextColor={c.textMuted}
          accessibilityLabel="Search listings"
          style={{ flex: 1, color: c.text, fontSize: 16, minHeight: 46 }}
        />
        {q ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => { setQ(""); setSubmittedQ(""); }}>
            <Ionicons name="close-circle" size={20} color={c.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {SECTIONS.map((s) => (
          <Chip key={s.label} label={s.label} selected={kind === s.kind && (s.kind !== null || !category)} onPress={() => { setKind(s.kind); setCategory(""); }} />
        ))}
      </ScrollView>

      {top ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          <Chip label={`All ${top.name.toLowerCase()}`} selected={category === top.slug} onPress={() => setCategory(top.slug)} />
          {top.subcategories.map((s) => <Chip key={s.slug} label={s.name} selected={category === s.slug} onPress={() => setCategory(s.slug)} />)}
        </ScrollView>
      ) : kind === null || kind === "SERVICE" ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {CATEGORIES.filter((cat) => cat.kind === "SERVICE").map((cat) => (
            <Chip key={cat.slug} label={cat.name} onPress={() => setCategory(cat.slug)} />
          ))}
        </ScrollView>
      ) : null}

      <View style={[styles.rowBetween]}>
        <Pressable accessibilityRole="button" onPress={() => router.push("/location")} style={styles.inline}>
          <Ionicons name="location-outline" size={16} color={c.textMuted} />
          <Text style={{ color: c.textMuted }}>{note ?? location.label}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: showFilters }} onPress={() => setShowFilters((v) => !v)} style={styles.inline}>
          <Ionicons name="options-outline" size={18} color={c.text} />
          <Text style={{ color: c.text, fontWeight: "600" }}>Filters{activeFilters ? ` (${activeFilters})` : ""}</Text>
        </Pressable>
      </View>

      {showFilters ? (
        <View style={[styles.filters, { borderColor: c.border, backgroundColor: c.surface }]}>
          <Body size={14}>Distance</Body>
          <View style={styles.wrap}>{RADII.map((r) => <Chip key={r} label={`${r} mi`} selected={radius === r} onPress={() => setRadius(r)} />)}</View>
          <Body size={14}>Language spoken</Body>
          <View style={styles.wrap}>
            {LANGUAGES.slice(1, 10).map((l) => <Chip key={l} label={l} selected={language === l} onPress={() => setLanguage(language === l ? null : l)} />)}
          </View>
          <View style={styles.wrap}>
            {effectiveKind === "SERVICE" || effectiveKind === null ? <Chip label="Verified only" icon="checkmark-circle-outline" selected={verifiedOnly} onPress={() => setVerifiedOnly((v) => !v)} /> : null}
            {effectiveKind === "PROPERTY" ? <Chip label="Rentals only" selected={rentOnly} onPress={() => setRentOnly((v) => !v)} /> : null}
            {effectiveKind === "JOB" ? <Chip label="Remote only" selected={remoteOnly} onPress={() => setRemoteOnly((v) => !v)} /> : null}
          </View>
        </View>
      ) : null}

      {!loading && !error ? <Text style={{ color: c.textMuted }} accessibilityLiveRegion="polite">{total} {total === 1 ? "result" : "results"}</Text> : null}
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 60 }}
      data={loading ? [] : items}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => <ListingCard item={item} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <ErrorState message={error} onRetry={() => load(1)} />
        ) : (
          <EmptyState title="Nothing matches yet" body="Try a wider distance, another language, or fewer words. We only show real, reviewed listings." />
        )
      }
      ListFooterComponent={more ? <ActivityIndicator color={c.primary} /> : undefined}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (!loading && !more && items.length < total) void load(page + 1);
      }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => load(1)} />}
      keyboardShouldPersistTaps="handled"
    />
  );
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12 },
  row: { gap: 8, paddingRight: 16 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  inline: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, flexShrink: 1 },
  filters: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
});
