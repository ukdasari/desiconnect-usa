// Native modules are mocked so logic and components can be tested in Node.
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

jest.mock("expo-secure-store", () => {
  const store = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK: 0,
    getItemAsync: jest.fn(async (k: string) => store.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string) => void store.set(k, v)),
    deleteItemAsync: jest.fn(async (k: string) => void store.delete(k)),
  };
});

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ status: "denied" })),
  requestPermissionsAsync: jest.fn(async () => ({ status: "denied" })),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
}));

jest.mock("expo-web-browser", () => ({ maybeCompleteAuthSession: jest.fn(), openAuthSessionAsync: jest.fn() }));
jest.mock("expo-auth-session", () => ({
  makeRedirectUri: jest.fn(() => "desiconnect://auth/callback"),
  fetchDiscoveryAsync: jest.fn(),
  AuthRequest: jest.fn(),
  ResponseType: { Code: "code" },
  exchangeCodeAsync: jest.fn(),
  refreshAsync: jest.fn(),
}));

jest.mock("expo-router", () => {
  const push = jest.fn();
  return {
    useRouter: () => ({ push, replace: jest.fn(), back: jest.fn(), canGoBack: () => true }),
    useLocalSearchParams: () => ({}),
    useFocusEffect: (cb: () => void) => require("react").useEffect(cb, []),
    Link: ({ children }: { children: unknown }) => children,
    __push: push,
  };
});

// Icon fonts can't load in Node; render icons as empty text.
jest.mock("@expo/vector-icons/Ionicons", () => {
  const Icon = () => require("react").createElement(require("react-native").Text, null, "");
  Icon.glyphMap = {};
  return { __esModule: true, default: Icon };
});
