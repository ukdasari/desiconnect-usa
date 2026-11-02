import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import type { ListingSummaryDto } from "@desiconnect/contracts";
import { ListingCard } from "@/components/listing-card";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/theme";

export default function ExploreScreen() {
  const { c } = useTheme();
  const params = useLocalSearchParams<{ category?: string }>();
  const [q, setQ] = useState("");
  const [city, setCity] = useState("Dallas");
  const [items, setItems] = useState<ListingSummaryDto[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<ListingSummaryDto[]>("/search", { query: { q: q || undefined, category: params.category, city, state: "TX", radiusMiles: "40" } });
      setItems(res.data);
      setNote(`${res.meta?.total ?? res.data.length} results`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [q, city, params.category]);

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.category]);

  return (
    <View style={styles.page}>
      <TextInput value={q} onChangeText={setQ} onSubmitEditing={run} placeholder="What do you need?" placeholderTextColor={c.textMuted} returnKeyType="search" accessibilityLabel="Search" style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]} />
      <TextInput value={city} onChangeText={setCity} onSubmitEditing={run} placeholder="City (Texas)" placeholderTextColor={c.textMuted} accessibilityLabel="City" style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]} />
      {error ? <Text style={{ color: c.danger }}>{error}</Text> : null}
      {note && !loading ? <Text style={{ color: c.textMuted }}>{note}{params.category ? ` in ${params.category}` : ""}</Text> : null}
      {loading ? <ActivityIndicator color={c.primary} /> : null}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <ListingCard item={item} />}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={!loading ? <Text style={{ color: c.textMuted }}>Nothing matches yet. Try a wider search.</Text> : undefined}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 16, gap: 10 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
});
