import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect, useState } from "react";
import { Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { REGULATED_DISCLAIMER, type ListingDetailDto, type RegistrationDto } from "@desiconnect/contracts";
import { CategoryIcon, SaveButton } from "@/components/listing-card";
import { Badge, Body, Button, Card, ErrorState, H1, H2, Loading, Notice, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { WEBSITE_URL } from "@/lib/config";
import { enumText, formatDate, formatEventWhen, money, salary } from "@/lib/format";
import { useRequireAuth } from "@/lib/require-auth";
import { space, useTheme } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

export default function ListingScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const navigation = useNavigation();
  const { data: l, error, loading, reload } = useApi<ListingDetailDto>(`/listings/${encodeURIComponent(slug)}`);

  useLayoutEffect(() => {
    if (l) navigation.setOptions({ headerRight: () => <HeaderActions listing={l} /> });
  }, [navigation, l]);

  if (loading && !l) return <Loading label="Loading listing" />;
  if (error || !l) return <Screen><ErrorState message={error ?? "Listing not found"} onRetry={reload} /></Screen>;
  return <ListingBody l={l} />;
}

function HeaderActions({ listing }: { listing: ListingDetailDto }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Share"
        hitSlop={10}
        style={{ padding: 8 }}
        onPress={() => Share.share({ message: `${listing.title} on DesiConnect: ${WEBSITE_URL}/listings/${listing.slug}` })}
      >
        <Ionicons name="share-outline" size={22} color={c.text} />
      </Pressable>
      <SaveButton listing={listing} />
    </View>
  );
}

function ListingBody({ l }: { l: ListingDetailDto }) {
  const { c } = useTheme();
  const router = useRouter();
  const { me } = useAuth();
  const requireAuth = useRequireAuth();
  const isOwner = me?.id === l.ownerId;

  return (
    <Screen>
      {l.isDemo ? <Notice title="Demonstration listing">This shows how listings work. The business, contact details and any license number are not real.</Notice> : null}
      {isOwner && l.status !== "PUBLISHED" ? <Notice tone="warning" title={`Only you can see this (${enumText(l.status).toLowerCase()})`}>{l.rejectionReason ?? undefined}</Notice> : null}

      <View style={{ flexDirection: "row", gap: space.md, alignItems: "flex-start" }}>
        <CategoryIcon icon={l.category.icon} slug={l.category.slug} size={52} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={styles.badges}>
            {l.provider?.verification === "VERIFIED" ? <Badge label="Verified" tone="success" icon="checkmark-circle" /> : l.provider?.verification === "PENDING" ? <Badge label="Verification pending" tone="warning" /> : null}
            <Badge label={l.subcategory?.name ?? l.category.name} />
          </View>
          <H1>{l.title}</H1>
          {l.provider ? <Body muted>by {l.provider.businessName}</Body> : l.job ? <Body muted>{l.job.company}</Body> : null}
        </View>
      </View>

      <Card>
        {l.event ? (
          <>
            <Fact icon="calendar-outline" label="When" value={formatEventWhen(l.event.startAt, l.event.endAt)} />
            <Fact icon="location-outline" label="Where" value={`${l.event.venue}, ${l.location.city}, ${l.location.state}`} />
            <Fact icon="people-outline" label="Attending" value={`${l.event.registeredCount}${l.event.capacity ? ` of ${l.event.capacity} spots` : " registered"}`} />
            <Fact icon="ticket-outline" label="Tickets" value={l.event.isFree ? "Free" : (l.priceText ?? "Paid")} />
          </>
        ) : null}
        {l.job ? (
          <>
            <Fact icon="briefcase-outline" label="Type" value={`${enumText(l.job.employmentType)}, ${enumText(l.job.workArrangement).toLowerCase()}`} />
            <Fact icon="cash-outline" label="Pay" value={salary(l.job) ?? "Not listed"} />
            <Fact icon="location-outline" label="Location" value={l.job.workArrangement === "REMOTE" ? "Remote (USA)" : `${l.location.city}, ${l.location.state}`} />
          </>
        ) : null}
        {l.property ? (
          <>
            <Fact icon="pricetag-outline" label={l.property.transactionType === "SALE" ? "Price" : "Rent"} value={`${money(l.property.price)}${l.property.transactionType === "SALE" ? "" : " / month"}`} />
            <Fact icon="home-outline" label="Home" value={[enumText(l.property.propertyType), l.property.beds !== null ? `${l.property.beds} bed` : null, l.property.baths !== null ? `${l.property.baths} bath` : null, l.property.sqft ? `${l.property.sqft.toLocaleString("en-US")} sq ft` : null].filter(Boolean).join(", ")} />
            <Fact icon="calendar-outline" label="Available" value={l.property.availableFrom ? formatDate(l.property.availableFrom) : "Ask the owner"} />
            <Fact icon="location-outline" label="Area" value={`${l.location.city}, ${l.location.state}`} />
          </>
        ) : null}
        {l.kind === "SERVICE" ? (
          <>
            <Fact icon="location-outline" label="Based in" value={`${l.location.city}, ${l.location.state}`} />
            {l.priceText ? <Fact icon="pricetag-outline" label="Pricing" value={l.priceText} /> : null}
          </>
        ) : null}
        {l.languages.length ? <Fact icon="language-outline" label="Languages" value={l.languages.join(", ")} /> : null}
      </Card>

      {!isOwner && l.status === "PUBLISHED" ? <PrimaryAction l={l} onSignInNeeded={requireAuth} /> : null}

      <View style={{ gap: space.sm }}>
        <H2>About</H2>
        <Body>{l.description}</Body>
        {(l.job?.skills.length ? l.job.skills : l.tags).length ? (
          <View style={styles.badges}>{(l.job?.skills.length ? l.job.skills : l.tags).map((t) => <Badge key={t} label={t} />)}</View>
        ) : null}
      </View>

      {l.regulated ? (
        <View style={{ gap: space.sm }}>
          <H2>Licenses</H2>
          {l.credentials.length ? (
            l.credentials.map((cr) => (
              <Card key={cr.id}>
                <Text style={{ color: c.text, fontWeight: "700" }}>{enumText(cr.type)}</Text>
                <Body muted size={14}>{cr.jurisdiction} license {cr.licenseNumber}{cr.issuingAuthority ? `, ${cr.issuingAuthority}` : ""}</Body>
                {cr.reviewStatus === "VERIFIED" ? <Badge label={`Checked ${cr.reviewedAt ? formatDate(cr.reviewedAt) : ""}`} tone="success" icon="checkmark-circle" /> : <Badge label="Not yet checked" tone="warning" />}
              </Card>
            ))
          ) : (
            <Body muted>This provider hasn't submitted a license yet.</Body>
          )}
          <Body muted size={13}>{REGULATED_DISCLAIMER}</Body>
        </View>
      ) : null}

      {l.contactPhone || l.contactEmail ? (
        <View style={{ gap: space.sm }}>
          <H2>Direct contact</H2>
          <View style={{ flexDirection: "row", gap: space.sm, flexWrap: "wrap" }}>
            {l.contactPhone ? <Button title="Call" icon="call-outline" variant="secondary" onPress={() => Linking.openURL(`tel:${l.contactPhone}`)} /> : null}
            {l.contactEmail ? <Button title="Email" icon="mail-outline" variant="secondary" onPress={() => Linking.openURL(`mailto:${l.contactEmail}`)} /> : null}
          </View>
        </View>
      ) : null}

      <Body muted size={14}>
        {l.ratingCount ? `${l.ratingAverage} out of 5 from ${l.ratingCount} reviews.` : "No reviews yet. Reviews appear after moderation."}
      </Body>
      {!isOwner && me ? <Button title="Report this listing" variant="ghost" icon="flag-outline" onPress={() => router.push({ pathname: "/report", params: { listingId: l.id } })} /> : null}
    </Screen>
  );
}

function PrimaryAction({ l, onSignInNeeded }: { l: ListingDetailDto; onSignInNeeded: (action: () => void, reason?: string) => void }) {
  const router = useRouter();
  const [guests, setGuests] = useState(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const { c } = useTheme();
  const inquire = () => router.push({ pathname: "/inquire", params: { listingId: l.id, title: l.title, kind: l.kind } });

  if (l.kind === "JOB") {
    return <Button title="Apply now" icon="document-text-outline" onPress={() => onSignInNeeded(() => router.push({ pathname: "/apply", params: { listingId: l.id, title: l.title, company: l.job?.company ?? "" } }), "Sign in to apply.")} />;
  }
  if (l.kind === "EVENT" && l.event) {
    const full = !!(l.event.capacity && l.event.registeredCount >= l.event.capacity);
    return (
      <Card>
        <Text style={{ color: c.text, fontWeight: "800", fontSize: 17 }}>{full ? "This event is full" : "Save your spot"}</Text>
        {result ? <Notice tone={result.ok ? "success" : "danger"}>{result.text}</Notice> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
          <Body>People</Body>
          <Pressable accessibilityRole="button" accessibilityLabel="Fewer people" onPress={() => setGuests((g) => Math.max(1, g - 1))} style={[styles.stepper, { borderColor: c.border }]}><Ionicons name="remove" size={20} color={c.text} /></Pressable>
          <Text accessibilityLiveRegion="polite" style={{ color: c.text, fontSize: 18, fontWeight: "700", minWidth: 24, textAlign: "center" }}>{guests}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="More people" onPress={() => setGuests((g) => Math.min(10, g + 1))} style={[styles.stepper, { borderColor: c.border }]}><Ionicons name="add" size={20} color={c.text} /></Pressable>
        </View>
        <Button
          title={full ? "Join the waitlist" : "RSVP"}
          loading={busy}
          onPress={() =>
            onSignInNeeded(async () => {
              setBusy(true);
              try {
                const { data } = await api<RegistrationDto>(`/events/${l.id}/registrations`, { method: "POST", body: { guests } });
                setResult({ ok: true, text: data.status === "WAITLISTED" ? "You're on the waitlist. The organizer will be in touch if a spot opens." : "You're registered. Find it under My requests." });
              } catch (e) {
                setResult({ ok: false, text: errorMessage(e) });
              } finally {
                setBusy(false);
              }
            }, "Sign in to RSVP.")
          }
        />
        {l.event.ticketUrl ? <Button title="Buy tickets" variant="ghost" icon="open-outline" onPress={() => Linking.openURL(l.event!.ticketUrl!)} /> : null}
        <Button title="Ask the organizer" variant="secondary" onPress={() => onSignInNeeded(inquire, "Sign in to contact the organizer.")} />
      </Card>
    );
  }
  return (
    <Button
      title={l.kind === "PROPERTY" ? "Contact the owner" : "Request a quote or callback"}
      icon="chatbubble-ellipses-outline"
      onPress={() => onSignInNeeded(inquire, "Sign in to send a request.")}
    />
  );
}

function Fact({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 12, paddingVertical: 4 }} accessible accessibilityLabel={`${label}: ${value}`}>
      <Ionicons name={icon} size={20} color={c.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: c.textMuted, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: c.text, fontWeight: "600", fontSize: 15 }}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" },
  stepper: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
