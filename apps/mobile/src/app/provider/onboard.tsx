import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { CATEGORIES, LANGUAGES } from "@desiconnect/contracts";
import { Body, Button, Chip, Field, Notice, Screen } from "@/components/ui";
import { api, errorMessage, fieldError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toStateCode } from "@/lib/location";
import { space } from "@/lib/theme";

export default function ProviderOnboard() {
  const router = useRouter();
  const { me, reloadMe } = useAuth();
  const [form, setForm] = useState({ businessName: "", description: "", email: me?.email ?? "", phone: "", website: "", city: "", state: "TX", zipCode: "" });
  const [cats, setCats] = useState<string[]>([]);
  const [langs, setLangs] = useState<string[]>(["English"]);
  const [radius, setRadius] = useState(25);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (list: string[], v: string, max: number) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v].slice(0, max));

  return (
    <Screen>
      <Body muted>An administrator reviews every profile before it shows a Verified badge. Licensed categories need a state license.</Body>
      {error ? <Notice tone="danger">{errorMessage(error)}</Notice> : null}
      <Field label="Business name" value={form.businessName} onChangeText={set("businessName")} error={fieldError(error, "businessName")} />
      <Field label="What you do" value={form.description} onChangeText={set("description")} multiline hint="Two or three sentences customers read first." error={fieldError(error, "description")} />
      <Body>Categories (up to 5)</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {CATEGORIES.filter((cat) => cat.kind === "SERVICE").map((cat) => (
          <Chip key={cat.slug} label={cat.regulated ? `${cat.name} (license)` : cat.name} selected={cats.includes(cat.slug)} onPress={() => setCats((v) => toggle(v, cat.slug, 5))} />
        ))}
      </View>
      {fieldError(error, "categorySlugs") ? <Notice tone="danger">{fieldError(error, "categorySlugs")}</Notice> : null}
      <Body>Languages you serve customers in</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {LANGUAGES.map((l) => <Chip key={l} label={l} selected={langs.includes(l)} onPress={() => setLangs((v) => toggle(v, l, 8))} />)}
      </View>
      <Field label="Business email" value={form.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" error={fieldError(error, "email")} />
      <Field label="Business phone" value={form.phone} onChangeText={set("phone")} keyboardType="phone-pad" error={fieldError(error, "phone")} />
      <Field label="Website (optional)" value={form.website} onChangeText={set("website")} autoCapitalize="none" keyboardType="url" placeholder="https://" error={fieldError(error, "website")} />
      <Field label="City" value={form.city} onChangeText={set("city")} error={fieldError(error, "city")} />
      <View style={{ flexDirection: "row", gap: space.md }}>
        <View style={{ flex: 1 }}><Field label="State" value={form.state} onChangeText={(t) => set("state")(t.toUpperCase().slice(0, 2))} maxLength={2} autoCapitalize="characters" /></View>
        <View style={{ flex: 1 }}><Field label="ZIP" value={form.zipCode} onChangeText={(t) => set("zipCode")(t.replace(/\D/g, "").slice(0, 5))} keyboardType="number-pad" /></View>
      </View>
      <Body>How far you travel</Body>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
        {[0, 10, 25, 50].map((r) => <Chip key={r} label={r === 0 ? "Customers come to me" : `${r} miles`} selected={radius === r} onPress={() => setRadius(r)} />)}
      </View>
      <Button
        title="Create business profile"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await api("/providers", { method: "POST", body: { ...form, state: toStateCode(form.state), categorySlugs: cats, languages: langs, serviceRadiusMiles: radius } });
            await reloadMe();
            router.replace("/provider");
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
