import { ClientThrottlerGuard } from "../src/common/client-throttler.guard";

// getTracker is protected; reach it through a typed cast for the test.
type Tracker = { getTracker(req: Record<string, unknown>): Promise<string> };

function guard(key: string) {
  const g = Object.create(ClientThrottlerGuard.prototype) as Record<string, unknown>;
  g.appConfig = { INTERNAL_API_KEY: key };
  return g as unknown as Tracker;
}

describe("per-visitor rate limiting", () => {
  const key = "k".repeat(32);
  it("uses the forwarded visitor IP only when the website proves itself with the shared key", async () => {
    expect(await guard(key).getTracker({ ip: "10.0.0.5", headers: { "x-internal-key": key, "x-client-ip": "203.0.113.9" } })).toBe("client:203.0.113.9");
    expect(await guard(key).getTracker({ ip: "10.0.0.5", headers: { "x-internal-key": "wrong", "x-client-ip": "203.0.113.9" } })).toBe("10.0.0.5");
    expect(await guard(key).getTracker({ ip: "10.0.0.5", headers: { "x-client-ip": "203.0.113.9" } })).toBe("10.0.0.5");
    expect(await guard(key).getTracker({ ip: "10.0.0.5", headers: { "x-internal-key": key, "x-client-ip": "not an ip; drop table" } })).toBe("10.0.0.5");
    expect(await guard("").getTracker({ ip: "10.0.0.5", headers: { "x-internal-key": "", "x-client-ip": "203.0.113.9" } })).toBe("10.0.0.5");
  });
});
