import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { CATEGORIES, EMPLOYMENT_TYPES, LANGUAGES, TRANSACTION_TYPES, WORK_ARRANGEMENTS, getCategory, type ListingDetailDto } from "@desiconnect/contracts";
import { Body, Button, Checkbox, Chip, Field, H2, Notice, Screen } from "@/components/ui";
import { api, errorMessage, fieldError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { enumText } from "@/lib/format";
import { toStateCode } from "@/lib/location";
import { space } from "@/lib/theme";

/** "2026-11-14 18:30" in Central time → ISO (DFW pilot). */
function centralToIso(date: string, time: string): string | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{1,2}:\d{2}$/.test(time)) return undefined;
  const [h, m] = time.split(":");
  const asUtc = new Date(`${date}T${h!.padStart(2, "0")}:${m}:00Z`);
  const tz = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", timeZoneName: "shortOffset" }).formatToParts(asUtc).find((p) => p.type === "timeZoneName")?.value;
  const offset = Number(tz?.match(/GMT([+-]\d+)/)?.[1] ?? -6);
  return new Date(asUtc.getTime() - offset * 3600_000).toISOString();
}

export default function NewListing() {
  const router = useRouter();
  const { me } = useAuth();
  const [category, setCategory] = useState("");
  const [f, setF] = useState({
    title: "", description: "", city: me?.city ?? "", state: me?.state ?? "TX", zipCode: "", contactPhone: "", priceText: "",
    date: "", time: "18:00", venue: "", capacity: "", isFree: true,
    company: "", employmentType: "FULL_TIME", workArrangement: "ONSITE", salaryMin: "", salaryMax: "", skills: "",
    transactionType: "RENT", price: "", beds: "", baths: "",
  });
  const [langs, setLangs] = useState<string[]>(["English"]);
  const [busy, setBusy] = useState<"submit" | "draft" | null>(null);
  const [error, setError] = useState<unknown>(null);
  const set = (k: keyof typeof f) => (v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const kind = getCategory(category)?.kind;
  const blocked = kind === "SERVICE" && !me?.providerId;
  const num = (v: string) => (v.trim() ? Number(v) : undefined);

  const submit = async (draft: boolean) => {
    setBusy(draft ? "draft" : "submit");
    setError(null);
    try {
      const body: Record<string, unknown> = {
        categorySlug: category, title: f.title, description: f.description, city: f.city, state: toStateCode(f.state), zipCode: f.zipCode,
        languages: langs, contactPhone: f.contactPhone, priceText: f.priceText, saveAsDraft: draft,
      };
      if (kind === "EVENT") body.event = { startAt: centralToIso(f.date, f.time), venue: f.venue, capacity: num(f.capacity), isFree: f.isFree };
      if (kind === "JOB") body.job = { company: f.company, employmentType: f.employmentType, workArrangement: f.workArrangement, salaryMin: num(f.salaryMin), salaryMax: num(f.salaryMax), salaryPeriod: "YEAR", skills: f.skills.split(",").map((s) => s.trim()).filter(Boolean) };
      if (kind === "PROPERTY") body.property = { transactionType: f.transactionType, propertyType: f.transactionType === "ROOMMATE" ? "ROOM" : "HOUSE", price: num(f.price), beds: num(f.beds), baths: num(f.baths) };
      const { data } = await api<ListingDetailDto>("/listings", { method: "POST", body });
      router.replace({ pathname: "/provider/listing/[id]", params: { id: data.id, created: "1" } });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      {error ? <Notice tone="danger">{errorMessage(error)}</Notice> : null}
      <H2>What are you posting?</H2>
      {CATEGORIES.filter((c) => c.kind !== "RESOURCE").map((c) => (
        <View key={c.slug} style={{ gap: 6 }}>
          <Body muted size={13}>{c.name}</Body>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {c.subcategories.map((s) => <Chip key={s.slug} label={s.name} selected={category === s.slug} onPress={() => setCategory(s.slug)} />)}
          </View>
        </View>
      ))}
      {blocked ? (
        <Notice tone="warning" title="Service listings need a business profile">
          Create your business profile first so customers know who they're contacting.
        </Notice>
      ) : null}
      {blocked ? <Button title="Create business profile" variant="secondary" onPress={() => router.push("/provider/onboard")} /> : null}

      {category && !blocked ? (
        <>
          <Field label={kind === "JOB" ? "Job title" : kind === "EVENT" ? "Event name" : "Title"} value={f.title} onChangeText={set("title")} error={fieldError(error, "title")} />
          <Field label="Description" value={f.description} onChangeText={set("description")} multiline error={fieldError(error, "description")} />

          {kind === "EVENT" ? (
            <>
              <View style={{ flexDirection: "row", gap: space.md }}>
                <View style={{ flex: 1 }}><Field label="Date" value={f.date} onChangeText={set("date")} placeholder="2026-11-20" hint="YYYY-MM-DD" error={fieldError(error, "event.startAt")} /></View>
                <View style={{ flex: 1 }}><Field label="Start (Central)" value={f.time} onChangeText={set("time")} placeholder="18:00" /></View>
              </View>
              <Field label="Venue" value={f.venue} onChangeText={set("venue")} error={fieldError(error, "event.venue")} />
              <Field label="Capacity (optional)" value={f.capacity} onChangeText={set("capacity")} keyboardType="number-pad" hint="RSVPs beyond this join a waitlist" />
              <Checkbox checked={f.isFree} onChange={set("isFree")} label="Free to attend" />
            </>
          ) : null}

          {kind === "JOB" ? (
            <>
              <Field label="Company" value={f.company} onChangeText={set("company")} error={fieldError(error, "job.company")} />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{EMPLOYMENT_TYPES.map((t) => <Chip key={t} label={enumText(t)} selected={f.employmentType === t} onPress={() => set("employmentType")(t)} />)}</View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{WORK_ARRANGEMENTS.map((t) => <Chip key={t} label={enumText(t)} selected={f.workArrangement === t} onPress={() => set("workArrangement")(t)} />)}</View>
              <View style={{ flexDirection: "row", gap: space.md }}>
                <View style={{ flex: 1 }}><Field label="Salary from ($/yr)" value={f.salaryMin} onChangeText={set("salaryMin")} keyboardType="number-pad" /></View>
                <View style={{ flex: 1 }}><Field label="Salary to" value={f.salaryMax} onChangeText={set("salaryMax")} keyboardType="number-pad" error={fieldError(error, "job.salaryMax")} /></View>
              </View>
              <Field label="Skills (comma separated)" value={f.skills} onChangeText={set("skills")} placeholder="Java, Playwright, SQL" />
            </>
          ) : null}

          {kind === "PROPERTY" ? (
            <>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{TRANSACTION_TYPES.map((t) => <Chip key={t} label={({ RENT: "For rent", SALE: "For sale", ROOMMATE: "Room / roommate" })[t]} selected={f.transactionType === t} onPress={() => set("transactionType")(t)} />)}</View>
              <Field label={f.transactionType === "SALE" ? "Price ($)" : "Rent per month ($)"} value={f.price} onChangeText={set("price")} keyboardType="number-pad" error={fieldError(error, "property.price")} />
              <View style={{ flexDirection: "row", gap: space.md }}>
                <View style={{ flex: 1 }}><Field label="Beds" value={f.beds} onChangeText={set("beds")} keyboardType="number-pad" /></View>
                <View style={{ flex: 1 }}><Field label="Baths" value={f.baths} onChangeText={set("baths")} keyboardType="decimal-pad" /></View>
              </View>
            </>
          ) : null}

          {kind === "SERVICE" ? <Field label="Pricing (optional)" value={f.priceText} onChangeText={set("priceText")} placeholder="Consultation from $150" /> : null}

          <View style={{ flexDirection: "row", gap: space.md }}>
            <View style={{ flex: 2 }}><Field label="City" value={f.city} onChangeText={set("city")} error={fieldError(error, "city")} /></View>
            <View style={{ flex: 1 }}><Field label="State" value={f.state} onChangeText={(t) => set("state")(t.toUpperCase().slice(0, 2))} maxLength={2} autoCapitalize="characters" /></View>
          </View>
          <Field label="ZIP (optional)" value={f.zipCode} onChangeText={(t) => set("zipCode")(t.replace(/\D/g, "").slice(0, 5))} keyboardType="number-pad" />
          <Field label="Contact phone (optional)" value={f.contactPhone} onChangeText={set("contactPhone")} keyboardType="phone-pad" error={fieldError(error, "contactPhone")} />
          <Body>Languages</Body>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {LANGUAGES.slice(0, 10).map((l) => <Chip key={l} label={l} selected={langs.includes(l)} onPress={() => setLangs((v) => (v.includes(l) ? v.filter((x) => x !== l) : [...v, l]))} />)}
          </View>
          <Button title="Submit for review" loading={busy === "submit"} disabled={!!busy} onPress={() => submit(false)} />
          <Button title="Save as draft" variant="secondary" loading={busy === "draft"} disabled={!!busy} onPress={() => submit(true)} />
          <Body muted size={13}>A moderator reviews new listings, usually within one business day.</Body>
        </>
      ) : null}
    </Screen>
  );
}
