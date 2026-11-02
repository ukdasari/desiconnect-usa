import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { AiChatResponseDto } from "@desiconnect/contracts";
import { ListingCard } from "@/components/listing-card";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/theme";

type Turn = { role: "user"; text: string } | { role: "assistant"; data: AiChatResponseDto } | { role: "error"; text: string };

export default function AiScreen() {
  const { c } = useTheme();
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);

  async function ask() {
    const message = text.trim();
    if (!message || busy) return;
    setTurns((t) => [...t, { role: "user", text: message }]);
    setText("");
    setBusy(true);
    try {
      const res = await api<AiChatResponseDto>("/ai/chat", { method: "POST", body: { message, location: { city: "Dallas", state: "TX" } } });
      setTurns((t) => [...t, { role: "assistant", data: res.data }]);
    } catch (e) {
      setTurns((t) => [...t, { role: "error", text: (e as Error).message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.log} accessibilityLiveRegion="polite">
        {turns.length === 0 ? <Text style={{ color: c.textMuted }}>Ask the way you&apos;d ask a friend, like “a pediatrician near Frisco who speaks Tamil.” Answers come only from DesiConnect listings.</Text> : null}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <Text key={i} style={[styles.user, { backgroundColor: c.peacock }]}>{t.text}</Text>
          ) : t.role === "error" ? (
            <Text key={i} style={{ color: c.danger }}>{t.text}</Text>
          ) : (
            <View key={i} style={{ gap: 8 }}>
              <Text style={{ color: c.text, lineHeight: 21 }}>{t.data.reply}</Text>
              {t.data.safety?.type === "emergency" || t.data.safety?.type === "crisis" ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  <Pressable accessibilityRole="button" onPress={() => Linking.openURL("tel:911")} style={[styles.call, { backgroundColor: c.danger }]}><Text style={styles.callText}>Call 911</Text></Pressable>
                  <Pressable accessibilityRole="button" onPress={() => Linking.openURL("tel:988")} style={[styles.call, { backgroundColor: c.danger }]}><Text style={styles.callText}>Call 988</Text></Pressable>
                </View>
              ) : null}
              {t.data.results.map((r) => <ListingCard key={r.id} item={r} />)}
            </View>
          ),
        )}
        {busy ? <ActivityIndicator color={c.primary} /> : null}
      </ScrollView>
      <View style={[styles.bar, { borderTopColor: c.border, backgroundColor: c.surface }]}>
        <TextInput value={text} onChangeText={setText} onSubmitEditing={ask} placeholder="What do you need help finding?" placeholderTextColor={c.textMuted} accessibilityLabel="Ask Desi AI" style={[styles.input, { color: c.text, borderColor: c.border }]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={ask} style={[styles.send, { backgroundColor: c.primary }]}><Text style={{ fontWeight: "800", color: "#1b1206" }}>Ask</Text></Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  log: { padding: 16, gap: 14 },
  user: { alignSelf: "flex-end", color: "#fff", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16, overflow: "hidden", maxWidth: "85%" },
  bar: { flexDirection: "row", gap: 8, padding: 10, borderTopWidth: 1 },
  input: { flex: 1, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  send: { borderRadius: 999, paddingHorizontal: 16, justifyContent: "center" },
  call: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  callText: { color: "#fff", fontWeight: "800" },
});
