import { Redirect, useRouter } from "expo-router";
import { useState } from "react";
import { Body, Button, Checkbox, Field, H1, Notice, Screen } from "@/components/ui";
import { errorMessage, fieldError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function Register() {
  const router = useRouter();
  const auth = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // With OIDC, account creation happens on the provider's page.
  if (auth.mode === "oidc") return <Redirect href="/sign-in" />;

  return (
    <Screen>
      <H1>Create your free account</H1>
      <Body muted>We never share your contact details with a provider until you send them a request.</Body>
      {error ? <Notice tone="danger">{errorMessage(error)}</Notice> : null}
      <Field label="Your name" value={name} onChangeText={setName} autoComplete="name" textContentType="name" error={fieldError(error, "name")} />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" error={fieldError(error, "email")} />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint="At least 8 characters" error={fieldError(error, "password")} />
      <Checkbox checked={terms} onChange={setTerms} label="I agree to the Terms of Use and Privacy Policy." />
      <Button
        title="Create account"
        loading={busy}
        disabled={!terms}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await auth.register(name.trim(), email.trim(), password);
            router.canGoBack() ? router.back() : router.replace("/");
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
