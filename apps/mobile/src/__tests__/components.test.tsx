import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import type { ListingSummaryDto } from "@desiconnect/contracts";
import { ListingCard } from "@/components/listing-card";
import { Button, Checkbox } from "@/components/ui";
import { setAuthHooks } from "@/lib/api";
import { AuthProvider, useAuth } from "@/lib/auth";

const listing: ListingSummaryDto = {
  id: "11111111-1111-4111-8111-111111111111",
  slug: "h-1b-consultations-111111",
  kind: "SERVICE",
  title: "H-1B and green card consultations (Demo)",
  excerpt: "Demo",
  category: { slug: "immigration", name: "Immigration", icon: "plane-landing" },
  subcategory: { slug: "work-visas", name: "Work Visas (H-1B, L-1)" },
  location: { addressLine: null, city: "Frisco", state: "TX", zipCode: null, latitude: 33.15, longitude: -96.82 },
  languages: ["English", "Telugu"],
  priceText: "Consultation from $150",
  provider: { id: "p1", businessName: "Sample Immigration Law Office (Demo)", verification: "VERIFIED", languages: [] },
  isDemo: true,
  distanceMiles: 2.4,
  event: null,
  job: null,
  property: null,
  isFavorite: false,
  publishedAt: null,
};

describe("UI components", () => {
  it("Checkbox exposes its checked state to screen readers and toggles", async () => {
    const onChange = jest.fn();
    await render(<Checkbox checked={false} onChange={onChange} label="Share my details" />);
    const box = screen.getByRole("checkbox", { name: "Share my details" });
    expect(box).toHaveProp("accessibilityState", { checked: false });
    await fireEvent.press(box);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("disabled buttons don't fire", async () => {
    const onPress = jest.fn();
    await render(<Button title="Send request" disabled onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "Send request" }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("ListingCard shows verification, demo label, distance and a descriptive accessibility label", async () => {
    await render(
      <AuthProvider>
        <ListingCard item={listing} />
      </AuthProvider>,
    );
    expect(screen.getByText("Verified")).toBeTruthy();
    expect(screen.getByText("Demo")).toBeTruthy();
    expect(screen.getByText(/Frisco, TX \(2.4 mi\)/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /H-1B and green card consultations \(Demo\)\. Frisco, TX\. Consultation from \$150\. Demo listing\./ })).toBeTruthy();
  });
});

function Probe() {
  const auth = useAuth();
  return (
    <>
      <Text testID="status">{auth.status}</Text>
      <Text testID="mode">{auth.mode ?? "none"}</Text>
      <Text testID="name">{auth.me?.name ?? ""}</Text>
      <Text testID="signin" onPress={() => auth.signInWithPassword("user@desiconnect.example", "DemoPass123!")}>go</Text>
    </>
  );
}

describe("AuthProvider (local mode)", () => {
  it("loads the sign-in mode, signs in, stores the token securely and attaches it to requests", async () => {
    const SecureStore = jest.requireMock("expo-secure-store");
    const calls: { url: string; auth?: string }[] = [];
    global.fetch = jest.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, auth: (init.headers as Record<string, string>).authorization });
      const body = url.endsWith("/auth/config")
        ? { data: { mode: "local", issuer: null, audience: null } }
        : url.endsWith("/auth/login")
          ? { data: { token: "jwt-abc", expiresAt: new Date(Date.now() + 3600_000).toISOString(), user: { id: "u1", name: "Demo User", roles: ["CONSUMER"] } } }
          : { data: { id: "u1", name: "Demo User", roles: ["CONSUMER"] } };
      return { ok: true, status: 200, json: async () => body } as Response;
    }) as unknown as typeof fetch;

    await render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("signedOut"));
    expect(screen.getByTestId("mode")).toHaveTextContent("local");

    await fireEvent.press(screen.getByTestId("signin"));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("signedIn"));
    expect(screen.getByTestId("name")).toHaveTextContent("Demo User");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("dc.session", expect.stringContaining("jwt-abc"), expect.anything());

    // Subsequent requests carry the stored token.
    const { api } = jest.requireActual("@/lib/api") as typeof import("@/lib/api");
    await api("/me");
    expect(calls.at(-1)).toMatchObject({ url: expect.stringContaining("/me"), auth: "Bearer jwt-abc" });
    setAuthHooks({ getToken: async () => null, onUnauthorized: () => {} });
  });
});
