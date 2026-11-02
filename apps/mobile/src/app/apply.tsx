import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Platform } from "react-native";
import { RESUME_MAX_BYTES } from "@desiconnect/contracts";
import { Body, Button, Card, Checkbox, Field, H1, Notice, Screen } from "@/components/ui";
import { api, errorMessage, fieldError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Picked = { uri: string; name: string; mimeType: string; size?: number; file?: File };

export default function Apply() {
  const { listingId, title, company } = useLocalSearchParams<{ listingId: string; title: string; company?: string }>();
  const router = useRouter();
  const { me } = useAuth();
  const [resume, setResume] = useState<Picked | null>(null);
  const [cover, setCover] = useState("");
  const [phone, setPhone] = useState(me?.phone ?? "");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [pickError, setPickError] = useState<string>();
  const [done, setDone] = useState(false);

  const pick = async () => {
    setPickError(undefined);
    const res = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled) return;
    const a = res.assets[0]!;
    if (a.size && a.size > RESUME_MAX_BYTES) return setPickError("That file is over 5 MB. Choose a smaller PDF or Word file.");
    setResume({ uri: a.uri, name: a.name, mimeType: a.mimeType ?? "application/pdf", size: a.size, file: (a as { file?: File }).file });
  };

  if (done) {
    return (
      <Screen>
        <Notice tone="success" title="Application submitted">The employer can now see your application. Status updates appear under My requests.</Notice>
        <Button title="View my requests" onPress={() => router.replace("/requests")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <H1>{title}</H1>
      {company ? <Body muted>{company}</Body> : null}
      <Body muted>Applying as {me?.name ?? me?.email} ({me?.email}).</Body>
      {error ? <Notice tone="danger">{errorMessage(error)}</Notice> : null}
      <Card>
        <Body>{resume ? `Resume: ${resume.name}` : "Attach your resume (PDF or Word, up to 5 MB). Only this employer can open it."}</Body>
        <Button title={resume ? "Choose a different file" : "Choose resume"} icon="attach" variant="secondary" onPress={pick} />
        {pickError || fieldError(error, "resume") ? <Notice tone="danger">{pickError ?? fieldError(error, "resume")}</Notice> : null}
      </Card>
      <Field label="Cover note (optional)" value={cover} onChangeText={setCover} multiline maxLength={4000} placeholder="A few lines about your experience and why this role fits." />
      <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" error={fieldError(error, "phone")} />
      <Checkbox checked={consent} onChange={setConsent} label="Share my application, resume and contact details with this employer." />
      <Button
        title="Submit application"
        loading={busy}
        disabled={!consent}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            const form = new FormData();
            form.append("consentToShare", "true");
            if (cover.trim()) form.append("coverLetter", cover.trim());
            if (phone.trim()) form.append("phone", phone.trim());
            if (resume) {
              // React Native's FormData accepts { uri, name, type }; the web build needs a real File.
              if (Platform.OS === "web" && resume.file) form.append("resume", resume.file, resume.name);
              else form.append("resume", { uri: resume.uri, name: resume.name, type: resume.mimeType } as unknown as Blob);
            }
            await api(`/jobs/${listingId}/applications`, { method: "POST", formData: form });
            setDone(true);
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
