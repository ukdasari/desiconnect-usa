import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  createInquirySchema,
  createListingSchema,
  moderationDecisionSchema,
  registerSchema,
  searchQuerySchema,
} from "../src";

describe("category taxonomy", () => {
  it("defines exactly the 15 primary categories with unique slugs", () => {
    expect(CATEGORIES).toHaveLength(15);
    const slugs = CATEGORIES.flatMap((c) => [c.slug, ...c.subcategories.map((s) => s.slug)]);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("marks legal, immigration, insurance, healthcare and tax categories as regulated", () => {
    const regulated = CATEGORIES.filter((c) => c.regulated).map((c) => c.slug).sort();
    expect(regulated).toEqual(["finance-taxes", "healthcare", "immigration", "insurance", "lawyers"]);
  });
});

describe("searchQuerySchema", () => {
  it("coerces query-string values and applies defaults", () => {
    const parsed = searchQuerySchema.parse({ category: "lawyers", radiusMiles: "10", verifiedOnly: "true", page: "2" });
    expect(parsed).toMatchObject({ category: "lawyers", radiusMiles: 10, verifiedOnly: true, page: 2, pageSize: 20 });
  });

  it("rejects unknown states and oversized pages", () => {
    expect(searchQuerySchema.safeParse({ state: "ZZ" }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
  });
});

describe("auth and inquiry schemas", () => {
  it("normalises email case on register", () => {
    expect(registerSchema.parse({ name: "Asha", email: "Asha@Example.COM", password: "longenough" }).email).toBe(
      "asha@example.com",
    );
  });

  it("requires explicit consent before an inquiry shares contact details", () => {
    const base = { listingId: "7f1e7a52-8a1d-4b87-9a43-2f4a1c0f3c11", message: "Please call me about pricing." };
    expect(createInquirySchema.safeParse(base).success).toBe(false);
    expect(createInquirySchema.safeParse({ ...base, consentToShare: true }).success).toBe(true);
  });
});

describe("listing and moderation schemas", () => {
  it("validates event end after start", () => {
    const result = createListingSchema.safeParse({
      categorySlug: "events",
      title: "Diwali Mela",
      description: "A community Diwali celebration with food and music.",
      city: "Frisco",
      state: "TX",
      event: { startAt: "2026-11-10T18:00:00Z", endAt: "2026-11-10T10:00:00Z", venue: "Community Park" },
    });
    expect(result.success).toBe(false);
  });

  it("requires a reason when rejecting", () => {
    expect(moderationDecisionSchema.safeParse({ decision: "REJECT" }).success).toBe(false);
    expect(moderationDecisionSchema.safeParse({ decision: "REJECT", reason: "Missing license" }).success).toBe(true);
    expect(moderationDecisionSchema.safeParse({ decision: "APPROVE" }).success).toBe(true);
  });
});
