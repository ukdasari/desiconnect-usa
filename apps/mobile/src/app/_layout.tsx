import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "@/lib/theme";

export default function RootLayout() {
  const { c, scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerStyle: { backgroundColor: c.background }, headerTintColor: c.text, contentStyle: { backgroundColor: c.background } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="listing/[slug]" options={{ title: "Listing" }} />
      </Stack>
    </>
  );
}
