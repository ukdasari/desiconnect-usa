import { useRouter } from "expo-router";
import { FlatList, RefreshControl } from "react-native";
import type { ListingSummaryDto } from "@desiconnect/contracts";
import { ListingCard } from "@/components/listing-card";
import { Button, EmptyState, ErrorState, Loading, Screen } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { space, useTheme } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

export default function Saved() {
  const { status } = useAuth();
  if (status !== "signedIn") return <SignedOut />;
  return <SavedList />;
}

function SignedOut() {
  const router = useRouter();
  return (
    <Screen>
      <EmptyState title="Save listings to compare later" body="Sign in and tap the heart on any provider, event, job or home." action={<Button title="Sign in" onPress={() => router.push("/sign-in")} />} />
    </Screen>
  );
}

function SavedList() {
  const { c } = useTheme();
  const router = useRouter();
  const { data, error, loading, refreshing, reload, setData } = useApi<ListingSummaryDto[]>("/me/favorites");
  if (loading && !data) return <Loading />;
  if (error && !data) return <Screen><ErrorState message={error} onRetry={reload} /></Screen>;
  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      contentContainerStyle={{ padding: space.lg, gap: space.md }}
      data={data ?? []}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => <ListingCard item={item} onUnsave={() => setData((d) => d?.filter((x) => x.id !== item.id) ?? null)} />}
      ListEmptyComponent={<EmptyState title="Nothing saved yet" body="Tap the heart on any listing to keep it here." action={<Button title="Explore" variant="secondary" onPress={() => router.push("/explore")} />} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
    />
  );
}
