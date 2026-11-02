import { api, ApiError, errorMessage, fieldError, setAuthHooks } from "@/lib/api";
import { priceLine, salary } from "@/lib/format";
import { fromZip, locationQuery, toStateCode } from "@/lib/location";

const ok = (data: unknown, status = 200) => ({ ok: status < 400, status, json: async () => data }) as Response;

describe("location helpers", () => {
  it("normalises state names and codes from device geocoding", () => {
    expect(toStateCode("Texas")).toBe("TX");
    expect(toStateCode("tx")).toBe("TX");
    expect(toStateCode("New Jersey")).toBe("NJ");
    expect(toStateCode("Ontario")).toBeUndefined();
  });

  it("accepts only 5-digit ZIPs", () => {
    expect(fromZip("75034")).toEqual({ zip: "75034", label: "ZIP 75034" });
    expect(fromZip("7503")).toBeNull();
    expect(locationQuery({ city: "Frisco", state: "TX", label: "Frisco, TX" })).toEqual({ city: "Frisco", state: "TX", zip: undefined });
  });
});

describe("formatting", () => {
  it("formats salary ranges and prices", () => {
    expect(salary({ company: "X", employmentType: "FULL_TIME", workArrangement: "HYBRID", salaryMin: 100000, salaryMax: 120000, salaryPeriod: "YEAR", skills: [] })).toBe("$100,000–$120,000 / year");
    const rental = { property: { price: 2350, transactionType: "RENT" }, job: null, priceText: null } as unknown as Parameters<typeof priceLine>[0];
    expect(priceLine(rental)).toBe("$2,350 / month");
  });
});

describe("API client", () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("sends the bearer token and unwraps the envelope", async () => {
    setAuthHooks({ getToken: async () => "tok-123", onUnauthorized: jest.fn() });
    fetchMock.mockResolvedValueOnce(ok({ data: [{ id: 1 }], meta: { total: 1 }, traceId: "t" }));
    const res = await api<{ id: number }[]>("/search", { query: { q: "dosa", city: undefined } });
    expect(res.data).toEqual([{ id: 1 }]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:4000/api/v1/search?q=dosa");
    expect(init.headers.authorization).toBe("Bearer tok-123");
  });

  it("signs the user out when the API rejects the token", async () => {
    const onUnauthorized = jest.fn();
    setAuthHooks({ getToken: async () => "expired", onUnauthorized });
    fetchMock.mockResolvedValueOnce(ok({ error: { code: "UNAUTHENTICATED", message: "Sign in" }, traceId: "t" }, 401));
    await expect(api("/me")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it("exposes field-level validation errors", async () => {
    setAuthHooks({ getToken: async () => null, onUnauthorized: jest.fn() });
    fetchMock.mockResolvedValueOnce(ok({ error: { code: "VALIDATION_FAILED", message: "Some fields are invalid", details: { message: ["Too short"] } }, traceId: "t" }, 400));
    const err = await api("/inquiries", { method: "POST", body: {} }).catch((e) => e);
    expect(fieldError(err, "message")).toBe("Too short");
    expect(errorMessage(err)).toBe("Check the highlighted fields.");
  });

  it("reports network failures in plain language", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Network request failed"));
    const err = await api("/categories", { anonymous: true }).catch((e) => e);
    expect(err).toMatchObject({ code: "NETWORK" });
  });
});
