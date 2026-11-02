import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Badge, Body, Button, Card, H1, H2, ListRow, Notice, Screen } from "@/components/ui";
import { api, API_URL, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { enumText } from "@/lib/format";
import { useLocation } from "@/lib/location";
import { registerForPush } from "@/lib/push";
import { space, useTheme } from "@/lib/theme";

export default function Profile() {
  const router = useRouter();
  const { c } = useTheme();
  const auth = useAuth();
  const { location } = useLocation();
  const [notice, setNotice] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  if (auth.status !== "signedIn" || !auth.me) {
    return (
      <Screen>
        <H1>Your account</H1>
        <Body muted>Sign in to send requests, RSVP, apply to jobs, save listings and get updates.</Body>
        {auth.configError ? <Notice tone="danger">{auth.configError}</Notice> : null}
        <Button title="Sign in" onPress={() => router.push("/sign-in")} />
        {auth.mode === "local" ? <Button title="Create an account" variant="secondary" onPress={() => router.push("/register")} /> : null}
        <View style={{ marginTop: space.lg }}>
          <ListRow title="Location" subtitle={location.label} icon="location-outline" onPress={() => router.push("/location")} />
          <ListRow title="Emergency help" subtitle="911, 988 and help lines" icon="call-outline" onPress={() => router.push("/emergency")} />
        </View>
      </Screen>
    );
  }

  const me = auth.me;
  const isProvider = !!me.providerId || me.roles.some((r) => ["PROVIDER", "ORGANIZER", "EMPLOYER", "ADVERTISER"].includes(r));
  return (
    <Screen>
      <Card>
        <Text style={{ color: c.text, fontSize: 22, fontWeight: "800" }}>{me.name ?? "Your account"}</Text>
        <Body muted>{me.email}</Body>
        <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
          {me.roles.filter((r) => r !== "CONSUMER").map((r) => <Badge key={r} label={enumText(r)} />)}
        </View>
      </Card>
      {me.suspended ? <Notice tone="danger">Your account is suspended. You can browse but not post or send requests.</Notice> : null}
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <View>
        <ListRow title="My requests" subtitle="Service requests, applications and RSVPs" icon="list-outline" onPress={() => router.push("/requests")} />
        <ListRow title="Updates" subtitle="Replies and status changes" icon="notifications-outline" onPress={() => router.push("/notifications")} />
        <ListRow title="Edit profile" subtitle="Name, phone, city, languages" icon="person-circle-outline" onPress={() => router.push("/edit-profile")} />
        <ListRow title="Location" subtitle={location.label} icon="location-outline" onPress={() => router.push("/location")} />
        <ListRow
          title={isProvider ? "Provider dashboard" : "List your business or post a listing"}
          subtitle={isProvider ? "Listings, requests and verification" : "Services, events, jobs and homes"}
          icon="storefront-outline"
          onPress={() => router.push("/provider")}
        />
        <ListRow title="Emergency help" subtitle="911, 988 and help lines" icon="call-outline" onPress={() => router.push("/emergency")} />
      </View>

      <H2>Notifications and privacy</H2>
      <Button
        title="Turn on push notifications"
        icon="notifications-outline"
        variant="secondary"
        loading={pushBusy}
        onPress={async () => {
          setPushBusy(true);
          try {
            const r = await registerForPush();
            setNotice(
              r === "registered"
                ? { tone: "success", text: "Push notifications are on for this device." }
                : r === "denied"
                  ? { tone: "info", text: "Notifications are off. You can enable them in your phone's Settings." }
                  : { tone: "info", text: "Push notifications need the installed app on a physical device." },
            );
          } catch (e) {
            setNotice({ tone: "danger", text: errorMessage(e) });
          } finally {
            setPushBusy(false);
          }
        }}
      />
      <Button
        title="Delete Desi AI history"
        icon="trash-outline"
        variant="secondary"
        onPress={() =>
          Alert.alert("Delete Desi AI history?", "This removes all of your saved conversations.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  const { data } = await api<{ deletedConversations: number }>("/me/ai-history", { method: "DELETE" });
                  setNotice({ tone: "success", text: `Deleted ${data.deletedConversations} conversation(s).` });
                } catch (e) {
                  setNotice({ tone: "danger", text: errorMessage(e) });
                }
              },
            },
          ])
        }
      />
      <Button title="Sign out" variant="ghost" icon="log-out-outline" onPress={() => auth.signOut()} />
      <Body muted size={12}>Connected to {API_URL}</Body>
    </Screen>
  );
}
