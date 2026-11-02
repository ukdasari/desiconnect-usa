import { useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import type { ApplicationDto, InquiryDto, RegistrationDto } from "@desiconnect/contracts";
import { DateBlock } from "@/components/listing-card";
import { Badge, Body, Button, Card, Chip, EmptyState, ErrorState, Loading } from "@/components/ui";
import { api } from "@/lib/api";
import { enumText, formatEventWhen, relativeTime } from "@/lib/format";
import { space, useTheme } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

const tone = (s: string) =>
  (({ RESPONDED: "success", INTERVIEW: "success", OFFERED: "success", REGISTERED: "success", NEW: "warning", SUBMITTED: "warning", WAITLISTED: "warning", REJECTED: "danger" }) as const)[s as "NEW"] ?? "neutral";

export default function Requests() {
  const [tab, setTab] = useState<"inquiries" | "applications" | "rsvps">("inquiries");
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <View style={{ flexDirection: "row", gap: 8, padding: space.lg, paddingBottom: 0 }}>
        <Chip label="Requests" selected={tab === "inquiries"} onPress={() => setTab("inquiries")} />
        <Chip label="Applications" selected={tab === "applications"} onPress={() => setTab("applications")} />
        <Chip label="RSVPs" selected={tab === "rsvps"} onPress={() => setTab("rsvps")} />
      </View>
      {tab === "inquiries" ? <Inquiries /> : tab === "applications" ? <Applications /> : <Rsvps />}
    </View>
  );
}

function List<T>({ path, empty, render }: { path: string; empty: string; render: (item: T, reload: () => void) => React.ReactNode }) {
  const { data, error, loading, refreshing, reload } = useApi<T[]>(path);
  if (loading && !data) return <Loading />;
  if (error && !data) return <View style={{ padding: space.lg }}><ErrorState message={error} onRetry={reload} /></View>;
  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
      {data?.length ? data.map((item) => render(item, reload)) : <EmptyState title={empty} />}
    </ScrollView>
  );
}

function Inquiries() {
  const { c } = useTheme();
  const router = useRouter();
  return (
    <List<InquiryDto>
      path="/me/inquiries"
      empty="No requests yet"
      render={(i, reload) => (
        <Card key={i.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ color: c.text, fontWeight: "700", flex: 1 }} onPress={() => router.push({ pathname: "/listing/[slug]", params: { slug: i.listing.slug } })}>{i.listing.title}</Text>
            <Badge label={i.status === "VIEWED" ? "Seen" : enumText(i.status)} tone={tone(i.status)} />
          </View>
          <Body muted size={13}>Sent {relativeTime(i.createdAt)}</Body>
          <Body size={15}>{i.message}</Body>
          {i.providerResponse ? (
            <View style={{ backgroundColor: c.successSoft, borderRadius: 12, padding: 12, gap: 4 }}>
              <Text style={{ color: c.text, fontWeight: "700" }}>Reply{i.respondedAt ? `, ${relativeTime(i.respondedAt)}` : ""}</Text>
              <Body size={15}>{i.providerResponse}</Body>
            </View>
          ) : null}
          {i.status !== "CLOSED" ? <Button title="Close request" variant="ghost" onPress={async () => { await api(`/inquiries/${i.id}`, { method: "PATCH", body: { status: "CLOSED" } }); reload(); }} /> : null}
        </Card>
      )}
    />
  );
}

function Applications() {
  const { c } = useTheme();
  return (
    <List<ApplicationDto>
      path="/me/applications"
      empty="No applications yet"
      render={(a, reload) => (
        <Card key={a.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ color: c.text, fontWeight: "700", flex: 1 }}>{a.job.title}</Text>
            <Badge label={enumText(a.status)} tone={tone(a.status)} />
          </View>
          <Body muted size={14}>{a.job.company}, applied {relativeTime(a.createdAt)}{a.hasResume ? ", resume attached" : ""}</Body>
          {["SUBMITTED", "REVIEWING"].includes(a.status) ? (
            <Button title="Withdraw" variant="ghost" onPress={async () => { await api(`/applications/${a.id}`, { method: "PATCH", body: { status: "WITHDRAWN" } }); reload(); }} />
          ) : null}
        </Card>
      )}
    />
  );
}

function Rsvps() {
  const { c } = useTheme();
  return (
    <List<RegistrationDto>
      path="/me/registrations"
      empty="No RSVPs"
      render={(r, reload) =>
        r.status === "CANCELLED" ? null : (
          <Card key={r.id} style={{ flexDirection: "row", gap: 12 }}>
            <DateBlock iso={r.event.startAt} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: c.text, fontWeight: "700" }}>{r.event.title}</Text>
              <Body muted size={14}>{formatEventWhen(r.event.startAt, null)}, {r.event.venue}. {r.guests} {r.guests === 1 ? "person" : "people"}.</Body>
              <Badge label={enumText(r.status)} tone={tone(r.status)} />
              <Button title="Cancel RSVP" variant="ghost" onPress={async () => { await api(`/events/${r.event.listingId}/registrations`, { method: "DELETE" }); reload(); }} />
            </View>
          </Card>
        )
      }
    />
  );
}
