import { useState } from "react";
import { Alert as RNAlert, Switch, Text, View } from "react-native";
import { ALERT_TOPICS, getAlertTopic, type AlertDto, type NotificationSettingsDto } from "@desiconnect/contracts";
import { Badge, Body, Button, Card, Chip, EmptyState, ErrorState, Field, H2, Loading, Notice, Screen } from "@/components/ui";
import { api, errorMessage, fieldError } from "@/lib/api";
import { useLocation } from "@/lib/location";
import { space, useTheme } from "@/lib/theme";
import { useApi } from "@/lib/use-api";

/** Alerts: follow a topic near a place; choose whether alerts are emailed and pushed to this phone. */
export default function Alerts() {
  const { c } = useTheme();
  const { location } = useLocation();
  const alerts = useApi<AlertDto[]>("/me/alerts");
  const settings = useApi<NotificationSettingsDto>("/me/notification-settings");
  const [topic, setTopic] = useState("events");
  const [city, setCity] = useState(location.city ?? "");
  const [frequency, setFrequency] = useState<"INSTANT" | "WEEKLY">("INSTANT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (alerts.loading || settings.loading) return <Loading />;
  if (alerts.error) return <ErrorState message={alerts.error} onRetry={alerts.reload} />;

  const toggle = async (field: "alertEmails" | "alertPush", value: boolean) => {
    try {
      const { data } = await api<NotificationSettingsDto>("/me/notification-settings", { method: "PATCH", body: { [field]: value } });
      settings.setData(data);
    } catch (e) {
      setNotice(errorMessage(e));
    }
  };

  return (
    <Screen>
      <H2>Your alerts</H2>
      {alerts.data?.length ? (
        alerts.data.map((a) => (
          <Card key={a.id}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.text, fontWeight: "700", fontSize: 16 }}>{a.topicLabel}</Text>
                <Body muted size={13}>{a.locationLabel ? `Within ${a.radiusMiles} mi of ${a.locationLabel}` : "Anywhere"}</Body>
              </View>
              <Badge label={a.frequency === "INSTANT" ? "Instant" : "Weekly"} tone={a.frequency === "INSTANT" ? "warning" : "neutral"} />
            </View>
            <Button
              title="Remove"
              variant="ghost"
              icon="trash-outline"
              onPress={() =>
                RNAlert.alert("Remove this alert?", `${a.topicLabel}${a.locationLabel ? ` near ${a.locationLabel}` : ""}`, [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                      await api(`/me/alerts/${a.id}`, { method: "DELETE" });
                      alerts.reload();
                    },
                  },
                ])
              }
            />
          </Card>
        ))
      ) : (
        <EmptyState title="No alerts yet" body="Create one below to hear about new events, jobs and places near you." />
      )}

      <H2>New alert</H2>
      {notice ? <Notice tone="success">{notice}</Notice> : null}
      {error ? <Notice tone="danger">{errorMessage(error)}</Notice> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {ALERT_TOPICS.map((t) => (
          <Chip
            key={t.key}
            label={t.label}
            selected={topic === t.key}
            onPress={() => {
              setTopic(t.key);
              setFrequency(t.defaultFrequency);
            }}
          />
        ))}
      </View>
      <Body muted size={13}>{getAlertTopic(topic)?.hint}</Body>
      <Field label="City (Texas)" value={city} onChangeText={setCity} placeholder="Leave empty for anywhere" error={fieldError(error, "city")} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Chip label="Instant" selected={frequency === "INSTANT"} onPress={() => setFrequency("INSTANT")} />
        <Chip label="Weekly digest" selected={frequency === "WEEKLY"} onPress={() => setFrequency("WEEKLY")} />
      </View>
      <Button
        title="Create alert"
        icon="notifications-outline"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          setNotice(null);
          try {
            await api("/me/alerts", { method: "POST", body: { topic, city: city.trim() || undefined, state: city.trim() ? "TX" : undefined, frequency, radiusMiles: 25 } });
            setNotice("Alert created.");
            alerts.reload();
          } catch (e) {
            setError(e);
          } finally {
            setBusy(false);
          }
        }}
      />

      <H2>How we reach you</H2>
      <Card>
        {(
          [
            ["alertPush", "Notifications on this phone"],
            ["alertEmails", `Email${settings.data ? ` (${settings.data.email})` : ""}`],
          ] as const
        ).map(([field, label]) => (
          <View key={field} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 }}>
            <Text style={{ color: c.text, flex: 1, fontSize: 15 }}>{label}</Text>
            <Switch value={settings.data?.[field] ?? true} onValueChange={(v) => void toggle(field, v)} accessibilityLabel={label} />
          </View>
        ))}
        <Body muted size={12}>Alerts also appear under Updates. Account messages are always sent.</Body>
      </Card>
    </Screen>
  );
}
