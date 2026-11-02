import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { LANGUAGES } from "@desiconnect/contracts";
import { Body, Button, Chip, Field, Notice, Screen } from "@/components/ui";
import { api, errorMessage, fieldError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toStateCode } from "@/lib/location";
import { space } from "@/lib/theme";

export default function EditProfile() {
  const router = useRouter();
  const { me, reloadMe } = useAuth();
  const [name, setName] = useState(me?.name ?? "");
  const [phone, setPhone] = useState(me?.phone ?? "");
  const [city, setCity] = useState(me?.city ?? "");
  const [state, setState] = useState(me?.state ?? "TX");
  const [zip, setZip] = useState(me?.zipCode ?? "");
  const [langs, setLangs] = useState<string[]>(me?.preferredLanguages ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  return (
    <Screen>
      {error ? <Notice tone="danger">{errorMessage(error)}</Notice> : null}
      <Field label="Name" value={name} onChangeText={setName} autoComplete="name" error={fieldError(error, "name")} />
      <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={fieldError(error, "phone")} />
      <Field label="City" value={city} onChangeText={setCity} />
      <View style={{ flexDirection: "row", gap: space.md }}>
        <View style={{ flex: 1 }}><Field label="State" value={state} onChangeText={(t) => setState(t.toUpperCase().slice(0, 2))} autoCapitalize="characters" maxLength={2} error={fieldError(error, "state")} /></View>
        <View style={{ flex: 1 }}><Field label="ZIP" value={zip} onChangeText={(t) => setZip(t.replace(/\D/g, "").slice(0, 5))} keyboardType="number-pad" error={fieldError(error, "zipCode")} /></View>
      </View>
      <Body>Languages you're comfortable with</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {LANGUAGES.map((l) => <Chip key={l} label={l} selected={langs.includes(l)} onPress={() => setLangs((v) => (v.includes(l) ? v.filter((x) => x !== l) : [...v, l].slice(0, 5)))} />)}
      </View>
      <Button
        title="Save profile"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await api("/me", { method: "PATCH", body: { name: name.trim() || undefined, phone, city, state: toStateCode(state), zipCode: zip, preferredLanguages: langs } });
            await reloadMe();
            router.back();
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
