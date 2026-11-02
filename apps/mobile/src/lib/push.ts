import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "./api";
import { KEYS, prefs } from "./storage";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/**
 * Asks for notification permission and registers this device's Expo push token with the API.
 * Returns a short status the UI can explain. Needs a physical device and an EAS project ID.
 */
export async function registerForPush(): Promise<"registered" | "denied" | "unsupported"> {
  if (Platform.OS === "web" || !Device.isDevice) return "unsupported";
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "Updates", importance: Notifications.AndroidImportance.DEFAULT });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return "denied";
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return "unsupported";
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
  await api("/me/devices", { method: "POST", body: { token, platform: Platform.OS } });
  await prefs.set(KEYS.pushToken, token);
  return "registered";
}

export async function unregisterPush() {
  const token = await prefs.get<string>(KEYS.pushToken);
  if (!token) return;
  await api(`/me/devices/${encodeURIComponent(token)}`, { method: "DELETE" }).catch(() => {});
  await prefs.remove(KEYS.pushToken);
}
