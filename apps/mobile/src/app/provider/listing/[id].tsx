import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import type { ApplicationDto, ListingDetailDto } from "@desiconnect/contracts";
import { Badge, Body, Button, Card, Chip, EmptyState, ErrorState, H2, Loading, Notice } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { enumText, relativeTime } from "@/lib/format";
import { space, useTheme } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

interface Attendee { id: string; status: string; guests: number; attendee: { name: string | null; email: string } }
const NEXT_STATUS = ["REVIEWING", "INTERVIEW", "OFFERED", "REJECTED"] as const;

export default function ManageListing() {
  const { id, created } = useLocalSearchParams<{ id: string; created?: string }>();
  const { c } = useTheme();
  const router = useRouter();
  const listing = useApi<ListingDetailDto>(`/listings/${id}`);
  const l = listing.data;
  const apps = useApi<ApplicationDto[]>(l?.kind === "JOB" ? `/jobs/${id}/applications` : null, {}, [l?.kind]);
  const rsvps = useApi<Attendee[]>(l?.kind === "EVENT" ? `/events/${id}/registrations` : null, {}, [l?.kind]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(created ? { ok: true, text: "Saved. Submitted listings go live after a moderator approves them." } : null);
  const [busy, setBusy] = useState(false);

  if (listing.loading && !l) return <Loading />;
  if (listing.error || !l) return <View style={{ padding: space.lg }}><ErrorState message={listing.error ?? "Not found"} onRetry={listing.reload} /></View>;

  const act = async (action: "submit" | "archive") => {
    setBusy(true);
    try {
      await api(`/listings/${id}`, { method: "PATCH", body: { action } });
      setMsg({ ok: true, text: action === "submit" ? "Submitted for review." : "Archived. It's no longer visible." });
      listing.reload();
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: space.lg, gap: space.lg }} refreshControl={<RefreshControl refreshing={listing.refreshing} onRefresh={listing.reload} />}>
      <Card>
        <Text style={{ color: c.text, fontSize: 20, fontWeight: "800" }}>{l.title}</Text>
        <Badge label={enumText(l.status)} tone={l.status === "PUBLISHED" ? "success" : l.status === "REJECTED" ? "danger" : "warning"} />
        {l.rejectionReason ? <Notice tone="danger" title="Changes requested">{l.rejectionReason}</Notice> : null}
      </Card>
      {msg ? <Notice tone={msg.ok ? "success" : "danger"}>{msg.text}</Notice> : null}
      <View style={{ gap: space.sm }}>
        {l.status === "PUBLISHED" ? <Button title="View public page" variant="secondary" onPress={() => router.push({ pathname: "/listing/[slug]", params: { slug: l.slug } })} /> : null}
        {["DRAFT", "REJECTED", "ARCHIVED"].includes(l.status) ? <Button title="Submit for review" loading={busy} onPress={() => act("submit")} /> : null}
        {l.status !== "ARCHIVED" ? <Button title="Archive" variant="ghost" disabled={busy} onPress={() => act("archive")} /> : null}
        <Button title="Requests for this listing" variant="secondary" icon="chatbubbles-outline" onPress={() => router.push({ pathname: "/provider/leads", params: { listingId: l.id } })} />
        <Body muted size={13}>Edit full listing details on the website's provider dashboard.</Body>
      </View>

      {l.kind === "JOB" ? (
        <View style={{ gap: space.md }}>
          <H2>Applications ({apps.data?.length ?? 0})</H2>
          {apps.data?.length ? (
            apps.data.map((a) => (
              <Card key={a.id}>
                <Text style={{ color: c.text, fontWeight: "700" }}>{a.applicant?.name ?? "Applicant"}</Text>
                <Body muted size={13}>{a.applicant?.email}{a.phone ? `, ${a.phone}` : ""} · {relativeTime(a.createdAt)}{a.hasResume ? " · resume on the website" : ""}</Body>
                {a.coverLetter ? <Body size={15}>{a.coverLetter}</Body> : null}
                <Badge label={enumText(a.status)} />
                {a.status !== "WITHDRAWN" ? (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {NEXT_STATUS.map((s) => (
                      <Chip key={s} label={enumText(s)} selected={a.status === s} onPress={async () => { await api(`/applications/${a.id}`, { method: "PATCH", body: { status: s } }); apps.reload(); }} />
                    ))}
                  </View>
                ) : null}
              </Card>
            ))
          ) : (
            <EmptyState title="No applications yet" />
          )}
        </View>
      ) : null}

      {l.kind === "EVENT" ? (
        <View style={{ gap: space.md }}>
          <H2>RSVPs ({rsvps.data?.filter((r) => r.status === "REGISTERED").reduce((s, r) => s + r.guests, 0) ?? 0} people)</H2>
          {rsvps.data?.length ? (
            rsvps.data.map((r) => (
              <Card key={r.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: "700" }}>{r.attendee.name ?? r.attendee.email}</Text>
                  <Body muted size={13}>{r.attendee.email}, {r.guests} {r.guests === 1 ? "person" : "people"}</Body>
                </View>
                <Badge label={enumText(r.status)} tone={r.status === "REGISTERED" ? "success" : "warning"} />
              </Card>
            ))
          ) : (
            <EmptyState title="No RSVPs yet" />
          )}
        </View>
      ) : null}
    </ScrollView>
  );
}
