import { useRouter } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { Body, Button, Card, Field, Notice, Screen } from "@/components/ui";
import { api, errorMessage, fieldError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

/** Account deletion, reachable from Profile (required by the App Store and Google Play). */
export default function DeleteAccount() {
  const router = useRouter();
  const auth = useAuth();
  const { c } = useTheme();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <Screen>
        <Notice tone="success">Your account has been deleted and you've been signed out.</Notice>
        <Body>
          We removed your profile and personal data. Reviews you wrote stay up without your name. If you signed in through another
          provider, that account is separate and you can delete it there.
        </Body>
        <Button title="Back to home" onPress={() => router.replace("/")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={{ color: c.text, fontSize: 22, fontWeight: "800" }}>Delete your account</Text>
      <Card>
        <Body>This permanently deletes:</Body>
        <Body muted>
          • Your profile and contact details{"\n"}• Requests, job applications and resumes, RSVPs{"\n"}• Saved listings, notifications and Desi AI
          history{"\n"}• Your business profile and listings, if you have one
        </Body>
        <Body muted>This can't be undone.</Body>
      </Card>
      {error ? <Notice tone="danger">{errorMessage(error)}</Notice> : null}
      <Field
        label="Type DELETE to confirm"
        value={confirm}
        onChangeText={setConfirm}
        autoCapitalize="characters"
        autoCorrect={false}
        error={fieldError(error, "confirm")}
      />
      <Button
        title="Delete my account"
        variant="danger"
        loading={busy}
        icon="trash-outline"
        disabled={confirm.trim() !== "DELETE" || busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await api("/me", { method: "DELETE", body: { confirm: confirm.trim() } });
            await auth.signOut().catch(() => {});
            setDone(true);
          } catch (e) {
            setError(e);
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
