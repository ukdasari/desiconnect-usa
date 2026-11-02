import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Body, Button, Checkbox, Chip, Field, H1, Notice, Screen } from "@/components/ui";
import { api, errorMessage, fieldError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { space } from "@/lib/theme";

const PLACEHOLDER: Record<string, string> = {
  SERVICE: "What do you need, when, and any details that help them quote accurately.",
  PROPERTY: "Introduce yourself, your move-in date and any questions.",
  EVENT: "Ask about parking, food, accessibility or group tickets.",
};

export default function Inquire() {
  const { listingId, title, kind } = useLocalSearchParams<{ listingId: string; title: string; kind?: string }>();
  const router = useRouter();
  const { me } = useAuth();
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState(me?.phone ?? "");
  const [contact, setContact] = useState<"EMAIL" | "PHONE" | "EITHER">("EMAIL");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [sent, setSent] = useState(false);

  if (sent) {
    return (
      <Screen>
        <Notice tone="success" title="Request sent">The provider will contact you the way you chose. You can follow it under My requests.</Notice>
        <Button title="View my requests" onPress={() => router.replace("/requests")} />
        <Button title="Done" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>{title}</H1>
      <Body muted>Your details are shared with this {kind === "PROPERTY" ? "owner" : "provider"} only after you agree below.</Body>
      {error ? <Notice tone="danger">{errorMessage(error)}</Notice> : null}
      <Field label="What do you need?" value={message} onChangeText={setMessage} multiline maxLength={2000} placeholder={PLACEHOLDER[kind ?? "SERVICE"] ?? PLACEHOLDER.SERVICE} error={fieldError(error, "message")} />
      <Body size={15}>Best way to reach you</Body>
      <View style={{ flexDirection: "row", gap: space.sm }}>
        {(["EMAIL", "PHONE", "EITHER"] as const).map((m) => <Chip key={m} label={m === "EMAIL" ? "Email" : m === "PHONE" ? "Phone" : "Either"} selected={contact === m} onPress={() => setContact(m)} />)}
      </View>
      <Field label={contact === "EMAIL" ? "Phone (optional)" : "Phone"} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" error={fieldError(error, "phone")} />
      <Checkbox checked={consent} onChange={setConsent} label={phone ? "Share my name, email and phone with them so they can reply." : "Share my name and email with them so they can reply."} />
      <Button
        title="Send request"
        loading={busy}
        disabled={!consent || message.trim().length < 10}
        accessibilityHint={!consent ? "Agree to share your details first" : undefined}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await api("/inquiries", { method: "POST", body: { listingId, message: message.trim(), phone, preferredContact: contact, consentToShare: true } });
            setSent(true);
          } catch (e) {
            setError(e);
          } finally {
            setBusy(false);
          }
        }}
      />
    </Screen>
  );
}
