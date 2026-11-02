import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { useTheme } from "@/lib/theme";

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };

export default function TabsLayout() {
  const { c } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.primaryStrong,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border },
        headerStyle: { backgroundColor: c.background },
        headerShadowVisible: false,
        headerTintColor: c.text,
        tabBarLabelStyle: { fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", headerShown: false, tabBarIcon: icon("home-outline") }} />
      <Tabs.Screen name="explore" options={{ title: "Explore", tabBarIcon: icon("search-outline") }} />
      <Tabs.Screen name="ai" options={{ title: "Desi AI", tabBarIcon: icon("sparkles-outline") }} />
      <Tabs.Screen name="saved" options={{ title: "Saved", tabBarIcon: icon("heart-outline") }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: icon("person-outline") }} />
    </Tabs>
  );
}
