import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Secrets (tokens) go to the iOS Keychain / Android Keystore via expo-secure-store.
 * The web build (used only for previews) falls back to localStorage.
 */
export const secure = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") return void globalThis.localStorage?.setItem(key, value);
    await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") return void globalThis.localStorage?.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  },
};

/** Non-secret preferences (location, onboarding state). */
export const prefs = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  set: (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value)),
  remove: (key: string) => AsyncStorage.removeItem(key),
};

export const KEYS = {
  session: "dc.session",
  location: "dc.location",
  onboarded: "dc.onboarded",
  pushToken: "dc.pushToken",
} as const;
