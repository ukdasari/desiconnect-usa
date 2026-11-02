import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { REPORT_REASONS } from "@desiconnect/contracts";
import { Body, Button, Chip, Field, Notice, Screen } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { enumText } from "@/lib/format";
import { space } from "@/lib/theme";

export default function Report() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();
  const router = useRouter();
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>("MISLEADING");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (sent) return <Screen><Notice tone="success" title="Thanks">Our moderators will review this listing.</Notice><Button title="Done" onPress={() => router.back()} /></Screen>;
  return (
    <Screen>
      <Body>What's wrong with this listing?</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {REPORT_REASONS.map((r) => <Chip key={r} label={enumText(r)} selected={reason === r} onPress={() => setReason(r)} />)}
      </View>
      <Field label="Details (optional)" value={details} onChangeText={setDetails} multiline maxLength={2000} />
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button title="Send report" loading={busy} onPress={async () => {
        setBusy(true);
        try {
          await api("/reports", { method: "POST", body: { targetType: "LISTING", targetId: listingId, reason, details } });
          setSent(true);
        } catch (e) {
          setError(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }} />
    </Screen>
  );
}
