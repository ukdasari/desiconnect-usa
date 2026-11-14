import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { Body, Button, Field, H1, Notice, Screen } from "@/components/ui";
import { errorMessage, fieldError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { space } from "@/lib/theme";

export default function SignIn() {
  const router = useRouter();
  const { reason } = useLocalSearchParams<{ reason?: string }>();
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const done = () => (router.canGoBack() ? router.back() : router.replace("/"));

  if (auth.configError) {
    return (
      <Screen>
        <Notice tone="danger" title="Can't reach 1StopDesi">{auth.configError}</Notice>
        <Button title="Try again" onPress={auth.retryConfig} />
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>Welcome back</H1>
      <Body muted>{reason ?? "Sign in to send requests, RSVP, apply to jobs and save listings."}</Body>
      {error ? <Notice tone="danger">{errorMessage(error)}</Notice> : null}

      {auth.mode === "oidc" ? (
        <View style={{ gap: space.md }}>
          <Button
            title="Sign in"
            loading={busy}
            accessibilityHint="Opens our secure sign-in page"
            onPress={async () => {
              setBusy(true);
              setError(null);
              try {
                if (await auth.signInWithProvider()) done();
              } catch (e) {
                setError(e);
              } finally {
                setBusy(false);
              }
            }}
          />
          <Button title="Create an account" variant="secondary" disabled={busy} onPress={async () => {
            setBusy(true);
            try {
              if (await auth.signInWithProvider({ signup: true })) done();
            } catch (e) {
              setError(e);
            } finally {
              setBusy(false);
            }
          }} />
          <Body muted size={14}>You'll continue on our secure sign-in page. 1StopDesi never sees your password.</Body>
        </View>
      ) : (
        <View style={{ gap: space.md }}>
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" error={fieldError(error, "email")} />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" error={fieldError(error, "password")} />
          <Button
            title="Sign in"
            loading={busy}
            onPress={async () => {
              setBusy(true);
              setError(null);
              try {
                await auth.signInWithPassword(email.trim(), password);
                done();
              } catch (e) {
                setError(e);
              } finally {
                setBusy(false);
              }
            }}
          />
          <Link href="/register" replace style={{ alignSelf: "center", padding: 8 }}>
            <Body>New here? Create an account</Body>
          </Link>
          {__DEV__ ? <Body muted size={13}>Development demo accounts: user@, provider@ or admin@1stopdesi.example, password DemoPass123!</Body> : null}
        </View>
      )}
    </Screen>
  );
}
