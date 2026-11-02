import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { LocationPicker } from "@/components/location-picker";
import { Body, Button, Screen } from "@/components/ui";
import { KEYS, prefs } from "@/lib/storage";
import { space, useTheme } from "@/lib/theme";

const POINTS = [
  ["Find people who get it", "Immigration attorneys, tax preparers, caterers, tutors and doctors who speak your language."],
  ["Act in one step", "Send a request, RSVP to an event or apply to a job without leaving the app."],
  ["Ask Desi AI", "Describe what you need in plain words. Answers come only from real listings."],
] as const;

export default function Onboarding() {
  const router = useRouter();
  const { c } = useTheme();
  const [step, setStep] = useState<"welcome" | "location">("welcome");

  const finish = async () => {
    await prefs.set(KEYS.onboarded, true);
    router.replace("/");
  };

  return (
    <Screen>
      <View style={{ backgroundColor: c.peacock, borderRadius: 24, padding: space.xl, gap: space.md, marginTop: space.xxl }}>
        <Text accessibilityRole="header" style={{ color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -0.4 }}>
          {step === "welcome" ? "Welcome to DesiConnect" : "Where should we look?"}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, lineHeight: 23 }}>
          {step === "welcome"
            ? "Services, events, jobs and homes from the Desi community, starting in Dallas–Fort Worth."
            : "We use your city to show nearby listings. You can change it any time, and location access is optional."}
        </Text>
      </View>

      {step === "welcome" ? (
        <>
          <View style={{ gap: space.lg }}>
            {POINTS.map(([title, body]) => (
              <View key={title} style={{ gap: 4 }}>
                <Text style={{ color: c.text, fontWeight: "800", fontSize: 18 }}>{title}</Text>
                <Body muted>{body}</Body>
              </View>
            ))}
          </View>
          <Button title="Get started" onPress={() => setStep("location")} />
        </>
      ) : (
        <>
          <LocationPicker onDone={finish} />
          <Button title="Skip for now" variant="ghost" onPress={finish} accessibilityHint="Uses Dallas–Fort Worth until you choose a location" />
        </>
      )}
    </Screen>
  );
}
