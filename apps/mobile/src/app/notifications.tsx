import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Button, EmptyState, ErrorState, Loading } from "@/components/ui";
import { api } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { space, useTheme } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

interface Item { id: string; title: string; body: string; read: boolean; createdAt: string }

export default function Notifications() {
  const { c } = useTheme();
  const { data, error, loading, refreshing, reload } = useApi<Item[]>("/me/notifications");
  if (loading && !data) return <Loading />;
  if (error && !data) return <View style={{ padding: space.lg }}><ErrorState message={error} onRetry={reload} /></View>;
  const unread = data?.filter((n) => !n.read).length ?? 0;
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: space.lg, gap: space.md }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
      {unread ? <Button title={`Mark ${unread} as read`} variant="secondary" onPress={async () => { await api("/me/notifications/read-all", { method: "POST" }); reload(); }} /> : null}
      {data?.length ? (
        data.map((n) => (
          <View key={n.id} style={{ borderBottomWidth: 1, borderColor: c.border, paddingBottom: space.md, gap: 4 }}>
            <Text style={{ color: c.text, fontWeight: n.read ? "500" : "800" }}>{n.title}</Text>
            <Text style={{ color: c.textMuted }}>{n.body}</Text>
            <Text style={{ color: c.textMuted, fontSize: 12 }}>{relativeTime(n.createdAt)}</Text>
          </View>
        ))
      ) : (
        <EmptyState title="No updates yet" body="Replies from providers, RSVP confirmations and application changes appear here." />
      )}
    </ScrollView>
  );
}
