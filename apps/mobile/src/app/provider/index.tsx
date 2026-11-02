import { Redirect, useRouter } from "expo-router";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import type { ProviderDashboardDto } from "@desiconnect/contracts";
import { Badge, Body, Button, Card, EmptyState, ErrorState, H2, ListRow, Loading, Notice } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { enumText } from "@/lib/format";
import { space, useTheme } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

type Dashboard = Omit<ProviderDashboardDto, "provider"> & { provider: ProviderDashboardDto["provider"] | null };
const statusTone = { PUBLISHED: "success", PENDING_REVIEW: "warning", REJECTED: "danger", DRAFT: "neutral", ARCHIVED: "neutral" } as const;

export default function ProviderDashboard() {
  const { status } = useAuth();
  if (status !== "signedIn") return <Redirect href="/sign-in" />;
  return <DashboardBody />;
}

function DashboardBody() {
  const { c } = useTheme();
  const router = useRouter();
  const { data, error, loading, refreshing, reload } = useApi<Dashboard>("/provider/dashboard");
  if (loading && !data) return <Loading />;
  if (error || !data) return <View style={{ padding: space.lg }}><ErrorState message={error ?? "Not available"} onRetry={reload} /></View>;
  const { provider, listings, stats } = data;

  return (
    <ScrollView style={{ backgroundColor: c.background }} contentContainerStyle={{ padding: space.lg, gap: space.lg }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}>
      {provider ? (
        <Card>
          <Text style={{ color: c.text, fontSize: 20, fontWeight: "800" }}>{provider.businessName}</Text>
          <Badge
            label={provider.verification === "VERIFIED" ? "Verified" : provider.verification === "PENDING" ? "Verification pending" : provider.verification === "REJECTED" ? "Verification not approved" : "Not verified"}
            tone={provider.verification === "VERIFIED" ? "success" : provider.verification === "REJECTED" ? "danger" : "warning"}
          />
          {provider.verification !== "VERIFIED" ? <Body muted size={14}>Submit licenses from the website's provider dashboard. An administrator checks them with the issuing state.</Body> : null}
        </Card>
      ) : (
        <Notice title="Offer a professional service?">Create a business profile to list services and get a Verified badge. Events, jobs and homes don't need one.</Notice>
      )}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {[["Live", stats.activeListings], ["In review", stats.pendingListings], ["New requests", stats.newInquiries], ["All requests", stats.totalInquiries]].map(([label, value]) => (
          <Card key={label as string} style={{ width: "48%", gap: 2 }}>
            <Body muted size={13}>{label}</Body>
            <Text style={{ color: c.text, fontSize: 26, fontWeight: "800" }}>{value}</Text>
          </Card>
        ))}
      </View>

      <View style={{ gap: space.sm }}>
        <Button title="New listing" icon="add" onPress={() => router.push("/provider/new-listing")} />
        <Button title={`Requests${stats.newInquiries ? ` (${stats.newInquiries} new)` : ""}`} variant="secondary" icon="chatbubbles-outline" onPress={() => router.push("/provider/leads")} />
        {!provider ? <Button title="Create business profile" variant="secondary" icon="storefront-outline" onPress={() => router.push("/provider/onboard")} /> : null}
      </View>

      <H2>Your listings</H2>
      {listings.length ? (
        <View>
          {listings.map((l) => (
            <ListRow
              key={l.id}
              title={l.title}
              subtitle={`${l.subcategory?.name ?? l.category.name} · ${l.inquiryCount} requests${l.isDemo ? " · demo" : ""}`}
              right={<Badge label={enumText(l.status)} tone={statusTone[l.status]} />}
              onPress={() => router.push({ pathname: "/provider/listing/[id]", params: { id: l.id } })}
            />
          ))}
        </View>
      ) : (
        <EmptyState title="No listings yet" body="Post a service, event, job or home. Moderators review each one, usually within a business day." />
      )}
    </ScrollView>
  );
}
