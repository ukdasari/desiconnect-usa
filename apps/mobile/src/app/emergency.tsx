import Ionicons from "@expo/vector-icons/Ionicons";
import { Linking, Pressable, Text, View } from "react-native";
import { Body, Screen } from "@/components/ui";
import { space, useTheme } from "@/lib/theme";

// National numbers only (same list as the website's /emergency page).
const LINES = [
  { number: "911", tel: "911", label: "Police, fire or medical emergency", urgent: true },
  { number: "988", tel: "988", label: "Suicide & Crisis Lifeline (call or text)", urgent: true },
  { number: "1-800-222-1222", tel: "18002221222", label: "Poison Help" },
  { number: "1-800-799-7233", tel: "18007997233", label: "National Domestic Violence Hotline" },
  { number: "211", tel: "211", label: "Local help with food, housing and bills" },
];

export default function Emergency() {
  const { c } = useTheme();
  return (
    <Screen>
      <View style={{ backgroundColor: c.danger, borderRadius: 20, padding: space.xl, gap: space.md }}>
        <Text accessibilityRole="header" style={{ color: "#fff", fontSize: 26, fontWeight: "800" }}>If anyone is in danger, call 911 now.</Text>
        <Text style={{ color: "rgba(255,255,255,0.9)", lineHeight: 21 }}>DesiConnect can't contact emergency services for you. 911 can connect an interpreter for many languages.</Text>
      </View>
      {LINES.map((l) => (
        <Pressable
          key={l.number}
          accessibilityRole="button"
          accessibilityLabel={`Call ${l.number}, ${l.label}`}
          onPress={() => Linking.openURL(`tel:${l.tel}`)}
          style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, borderRadius: 16, borderWidth: 1, borderColor: l.urgent ? c.danger : c.border, backgroundColor: l.urgent ? c.dangerSoft : c.surface }}
        >
          <Ionicons name="call" size={22} color={l.urgent ? c.danger : c.text} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: c.text, fontWeight: "800", fontSize: 18 }}>{l.number}</Text>
            <Body muted size={14}>{l.label}</Body>
          </View>
        </Pressable>
      ))}
      <Body muted size={14}>Indian consular services for Texas: Consulate General of India, Houston. Check its official website for current hours.</Body>
    </Screen>
  );
}
