import type React from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { AiChatResponseDto } from "@desiconnect/contracts";
import { ListingCard } from "@/components/listing-card";
import { Body, Chip } from "@/components/ui";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { locationQuery, useLocation } from "@/lib/location";
import { space, useTheme } from "@/lib/theme";

type Turn = { role: "user"; text: string } | { role: "assistant"; data: AiChatResponseDto } | { role: "error"; text: string };

const STARTERS = [
  "Find Telugu-speaking immigration attorneys near Frisco",
  "Show Indian cultural events this month",
  "Find a rental home in Prosper under $2,500",
  "Find Indian catering for 200 guests",
];

export default function AiScreen() {
  const { c } = useTheme();
  const { status } = useAuth();
  const { location } = useLocation();
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [busy, setBusy] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const ask = async (raw: string) => {
    const message = raw.trim();
    if (!message || busy) return;
    setTurns((t) => [...t, { role: "user", text: message }]);
    setText("");
    setBusy(true);
    try {
      const loc = locationQuery(location);
      const { data } = await api<AiChatResponseDto>("/ai/chat", {
        method: "POST",
        body: { message, conversationId, location: { city: loc.city ?? "", state: loc.state, zip: loc.zip ?? "" } },
      });
      setConversationId(data.conversationId);
      setTurns((t) => [...t, { role: "assistant", data }]);
    } catch (e) {
      setTurns((t) => [...t, { role: "error", text: errorMessage(e) }]);
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    }
  };

  const last = [...turns].reverse().find((t): t is Extract<Turn, { role: "assistant" }> => t.role === "assistant");
  const suggestions = last?.data.suggestions.length ? last.data.suggestions : turns.length ? [] : STARTERS;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scroll} contentContainerStyle={{ padding: space.lg, gap: space.lg }} accessibilityLiveRegion="polite">
        {turns.length === 0 ? (
          <View style={{ gap: space.sm }}>
            <Body>Ask the way you'd ask a friend, like “a pediatrician near Little Elm who speaks Tamil.”</Body>
            <Body muted size={14}>
              Answers come only from 1StopDesi listings, and Desi AI never contacts anyone for you.
              {status === "signedIn" ? " Conversations are saved to your account; delete them from Profile." : " You're not signed in, so nothing is saved."}
            </Body>
          </View>
        ) : null}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <Text key={i} style={[styles.user, { backgroundColor: c.peacock }]}>{t.text}</Text>
          ) : t.role === "error" ? (
            <Text key={i} style={{ color: c.danger }}>{t.text}</Text>
          ) : (
            <Answer key={i} data={t.data} />
          ),
        )}
        {busy ? (
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <ActivityIndicator color={c.primary} />
            <Body muted>Searching listings…</Body>
          </View>
        ) : null}
      </ScrollView>
      {suggestions.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: space.lg, paddingBottom: 8 }}>
          {suggestions.map((s) => <Chip key={s} label={s} onPress={() => ask(s)} />)}
        </ScrollView>
      ) : null}
      <View style={[styles.bar, { borderTopColor: c.border, backgroundColor: c.surface }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => ask(text)}
          returnKeyType="send"
          maxLength={1000}
          placeholder="What do you need help finding?"
          placeholderTextColor={c.textMuted}
          accessibilityLabel="Ask Desi AI"
          style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.background }]}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Send" disabled={busy || !text.trim()} onPress={() => ask(text)} style={[styles.send, { backgroundColor: c.primary, opacity: busy || !text.trim() ? 0.5 : 1 }]}>
          <Ionicons name="send" size={18} color={c.onPrimary} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Answer({ data }: { data: AiChatResponseDto }) {
  const { c } = useTheme();
  const urgent = data.safety?.type === "emergency" || data.safety?.type === "crisis";
  return (
    <View style={{ gap: space.md }}>
      {urgent ? (
        <View accessibilityRole="alert" style={[styles.alert, { backgroundColor: c.dangerSoft, borderColor: c.danger }]}>
          <Text style={{ color: c.text, fontWeight: "700", lineHeight: 21 }}>{data.reply}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable accessibilityRole="button" onPress={() => Linking.openURL("tel:911")} style={[styles.call, { backgroundColor: c.danger }]}><Text style={styles.callText}>Call 911</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => Linking.openURL("tel:988")} style={[styles.call, { backgroundColor: c.danger }]}><Text style={styles.callText}>Call or text 988</Text></Pressable>
          </View>
        </View>
      ) : (
        <Body>{data.reply}</Body>
      )}
      {data.results.map((r) => <ListingCard key={r.id} item={r} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  user: { alignSelf: "flex-end", color: "#fff", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, overflow: "hidden", maxWidth: "85%", fontSize: 16 },
  bar: { flexDirection: "row", gap: 8, padding: 10, borderTopWidth: 1, alignItems: "center" },
  input: { flex: 1, borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, minHeight: 46, fontSize: 16 },
  send: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  alert: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  call: { borderRadius: 999, paddingHorizontal: 16, minHeight: 44, justifyContent: "center" },
  callText: { color: "#fff", fontWeight: "800" },
});
