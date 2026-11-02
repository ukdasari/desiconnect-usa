import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, RefreshControl, ScrollView, Text, View } from "react-native";
import type { InquiryDto } from "@desiconnect/contracts";
import { Badge, Body, Button, Card, EmptyState, ErrorState, Field, Loading, Notice } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { enumText, relativeTime } from "@/lib/format";
import { space, useTheme } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

export default function Leads() {
  const { listingId } = useLocalSearchParams<{ listingId?: string }>();
  const { c } = useTheme();
  const { data, error, loading, refreshing, reload } = useApi<InquiryDto[]>("/provider/inquiries", { query: { listingId } });
  if (loading && !data) return <Loading />;
  if (error && !data) return <View style={{ padding: space.lg }}><ErrorState message={error} onRetry={reload} /></View>;
  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: space.lg, gap: space.md }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
      {data?.length ? data.map((i) => <Lead key={i.id} inquiry={i} onSaved={reload} />) : <EmptyState title="No requests yet" body="Customers who contact you from a listing appear here." />}
    </ScrollView>
  );
}

export function Lead({ inquiry: i, onSaved }: { inquiry: InquiryDto; onSaved: () => void }) {
  const { c } = useTheme();
  const [reply, setReply] = useState(i.providerResponse ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Text style={{ color: c.text, fontWeight: "700", flex: 1 }}>{i.requester?.name ?? "Customer"}</Text>
        <Badge label={enumText(i.status)} tone={i.status === "RESPONDED" ? "success" : i.status === "NEW" ? "warning" : "neutral"} />
      </View>
      <Body muted size={13}>{i.listing.title} · {relativeTime(i.createdAt)} · prefers {i.preferredContact.toLowerCase()}</Body>
      <Body size={15}>{i.message}</Body>
      <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
        {i.phone ? <Button title="Call" icon="call-outline" variant="secondary" onPress={() => Linking.openURL(`tel:${i.phone}`)} /> : null}
        {i.requester?.email ? <Button title="Email" icon="mail-outline" variant="secondary" onPress={() => Linking.openURL(`mailto:${i.requester!.email}`)} /> : null}
      </View>
      <Field label="Reply in the app" value={reply} onChangeText={setReply} multiline maxLength={2000} hint="The customer sees this under My requests and gets a notification." />
      {msg ? <Notice tone={msg.ok ? "success" : "danger"}>{msg.text}</Notice> : null}
      <Button
        title="Send reply"
        loading={busy}
        disabled={!reply.trim()}
        onPress={async () => {
          setBusy(true);
          try {
            await api(`/inquiries/${i.id}`, { method: "PATCH", body: { providerResponse: reply.trim() } });
            setMsg({ ok: true, text: "Reply sent." });
            onSaved();
          } catch (e) {
            setMsg({ ok: false, text: errorMessage(e) });
          } finally {
            setBusy(false);
          }
        }}
      />
    </Card>
  );
}
