import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/lib/auth";
import { LocationProvider } from "@/lib/location";
import { KEYS, prefs } from "@/lib/storage";
import { useTheme } from "@/lib/theme";

function OnboardingGate() {
  const router = useRouter();
  const segments = useSegments();
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (checked) return;
    prefs.get<boolean>(KEYS.onboarded).then((done) => {
      setChecked(true);
      if (!done && segments[0] !== "onboarding") router.replace("/onboarding");
    });
  }, [checked, router, segments]);
  return null;
}

export default function RootLayout() {
  const { c, scheme } = useTheme();
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <LocationProvider>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <OnboardingGate />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: c.background },
              headerTintColor: c.text,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: c.background },
              headerBackTitle: "Back",
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="listing/[slug]" options={{ title: "" }} />
            <Stack.Screen name="inquire" options={{ title: "Send a request", presentation: "modal" }} />
            <Stack.Screen name="apply" options={{ title: "Apply", presentation: "modal" }} />
            <Stack.Screen name="report" options={{ title: "Report listing", presentation: "modal" }} />
            <Stack.Screen name="sign-in" options={{ title: "Sign in", presentation: "modal" }} />
            <Stack.Screen name="register" options={{ title: "Create account", presentation: "modal" }} />
            <Stack.Screen name="location" options={{ title: "Your location", presentation: "modal" }} />
            <Stack.Screen name="requests" options={{ title: "My requests" }} />
            <Stack.Screen name="notifications" options={{ title: "Updates" }} />
            <Stack.Screen name="edit-profile" options={{ title: "Edit profile" }} />
            <Stack.Screen name="emergency" options={{ title: "Emergency help" }} />
            <Stack.Screen name="provider/index" options={{ title: "Provider dashboard" }} />
            <Stack.Screen name="provider/onboard" options={{ title: "List your business" }} />
            <Stack.Screen name="provider/new-listing" options={{ title: "New listing" }} />
            <Stack.Screen name="provider/leads" options={{ title: "Requests" }} />
            <Stack.Screen name="provider/listing/[id]" options={{ title: "Manage listing" }} />
          </Stack>
        </LocationProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
