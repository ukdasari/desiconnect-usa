import { auth, createTestApp, eventPayload, loginDemo, registerUser, type TestContext } from "./helpers";

const V = "/api/v1";
let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.app.close();
});

describe("platform", () => {
  it("reports readiness including PostGIS", async () => {
    const res = await ctx.http.get(`${V}/health/ready`).expect(200);
    expect(res.body.data.checks).toMatchObject({ database: "ok", postgis: "ok" });
    expect(res.body.traceId).toBeTruthy();
  });

  it("serves all 15 primary categories", async () => {
    const res = await ctx.http.get(`${V}/categories`).expect(200);
    expect(res.body.data).toHaveLength(15);
    expect(res.body.data.find((c: { slug: string }) => c.slug === "immigration").regulated).toBe(true);
  });

  it("returns a consistent error envelope for unknown routes and bad input", async () => {
    const notFound = await ctx.http.get(`${V}/listings/does-not-exist`).expect(404);
    expect(notFound.body).toMatchObject({ error: { code: "NOT_FOUND" }, traceId: expect.any(String) });
    const bad = await ctx.http.post(`${V}/auth/register`).send({ name: "A", email: "nope", password: "short" }).expect(400);
    expect(bad.body.error.code).toBe("VALIDATION_FAILED");
    expect(Object.keys(bad.body.error.details)).toEqual(expect.arrayContaining(["email", "password", "name"]));
  });
});

describe("authentication", () => {
  it("registers, signs in and returns the current user", async () => {
    const u = await registerUser(ctx, "Asha Rao");
    const me = await ctx.http.get(`${V}/me`).set(auth(u.token)).expect(200);
    expect(me.body.data).toMatchObject({ email: u.email, roles: ["CONSUMER"], providerId: null });
  });

  it("rejects missing and forged tokens", async () => {
    const missing = await ctx.http.get(`${V}/me`).expect(401);
    expect(missing.body.error.code).toBe("UNAUTHENTICATED");
    await ctx.http.get(`${V}/me`).set(auth("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJsb2NhbDp4In0.bad")).expect(401);
  });

  it("does not reveal whether an email exists on failed login", async () => {
    const res = await ctx.http.post(`${V}/auth/login`).send({ email: "nobody@test.example", password: "whatever-123" }).expect(401);
    expect(res.body.error.message).toBe("Email or password is incorrect");
  });

  it("refuses duplicate registrations", async () => {
    const u = await registerUser(ctx);
    await ctx.http.post(`${V}/auth/register`).send({ name: "Again", email: u.email, password: "correct-horse-battery" }).expect(409);
  });
});

describe("search", () => {
  it("filters by PostGIS radius", async () => {
    const near = await ctx.http.get(`${V}/search`).query({ category: "immigration", city: "Frisco", state: "TX", radiusMiles: 8 }).expect(200);
    const titles = near.body.data.map((l: { title: string }) => l.title);
    expect(titles.some((t: string) => t.startsWith("H-1B"))).toBe(true); // Frisco
    expect(titles.some((t: string) => t.startsWith("F-1"))).toBe(false); // Richardson, ~16 mi away
    expect(near.body.meta).toMatchObject({ page: 1, pageSize: 20, locationNote: "Within 8 miles of Frisco, TX" });
    expect(near.body.data[0].distanceMiles).toEqual(expect.any(Number));
  });

  it("filters by language and verified providers", async () => {
    const res = await ctx.http.get(`${V}/search`).query({ category: "immigration", language: "Kannada" }).expect(200);
    expect(res.body.data).toHaveLength(1);
    const verified = await ctx.http.get(`${V}/search`).query({ category: "immigration", verifiedOnly: "true" }).expect(200);
    expect(verified.body.data.every((l: { provider: { verification: string } }) => l.provider.verification === "VERIFIED")).toBe(true);
  });

  it("supports full-text keyword search and includes remote jobs everywhere", async () => {
    const res = await ctx.http.get(`${V}/jobs`).query({ q: "SDET", city: "Plano", state: "TX", radiusMiles: 5 }).expect(200);
    const titles = res.body.data.map((l: { title: string }) => l.title);
    expect(titles.some((t: string) => t.includes("Java SDET"))).toBe(false); // Irving is > 5 mi from Plano center
    // The remote SDET job (tagged "SDET", located in Seattle) is still returned for a Plano search.
    expect(titles.some((t: string) => t.includes("QA Automation Engineer — Remote"))).toBe(true);
    expect(res.body.data.every((l: { job: { workArrangement: string } }) => l.job.workArrangement === "REMOTE")).toBe(true);
  });

  it("never returns listings awaiting review", async () => {
    const res = await ctx.http.get(`${V}/search`).query({ q: "Term life" }).expect(200);
    expect(res.body.data).toHaveLength(0);
  });

  it("filters rentals by price", async () => {
    const res = await ctx.http.get(`${V}/properties`).query({ transactionType: "RENT", maxPrice: 2500 }).expect(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((l: { property: { price: number } }) => l.property.price <= 2500)).toBe(true);
  });
});

describe("listings, ownership and moderation", () => {
  it("runs the full create → review → publish flow with ownership checks", async () => {
    const owner = await registerUser(ctx, "Organizer");
    const other = await registerUser(ctx, "Other");
    const admin = await loginDemo(ctx, "admin");

    const created = await ctx.http.post(`${V}/listings`).set(auth(owner.token)).send(eventPayload()).expect(201);
    const id = created.body.data.id as string;
    expect(created.body.data.status).toBe("PENDING_REVIEW");

    // Not public yet: anonymous and other users get 404; the owner can see it.
    await ctx.http.get(`${V}/listings/${id}`).expect(404);
    await ctx.http.get(`${V}/listings/${id}`).set(auth(other.token)).expect(404);
    await ctx.http.get(`${V}/listings/${id}`).set(auth(owner.token)).expect(200);

    // Another user cannot edit it; the owner gained the ORGANIZER role.
    await ctx.http.patch(`${V}/listings/${id}`).set(auth(other.token)).send({ title: "Hijacked title here" }).expect(403);
    const me = await ctx.http.get(`${V}/me`).set(auth(owner.token)).expect(200);
    expect(me.body.data.roles).toContain("ORGANIZER");

    // Only admins can moderate.
    await ctx.http.post(`${V}/admin/listings/${id}/approve`).set(auth(owner.token)).expect(403);
    await ctx.http.post(`${V}/admin/listings/${id}/reject`).set(auth(admin.token)).send({ reason: "no" }).expect(400);
    const approved = await ctx.http.post(`${V}/admin/listings/${id}/approve`).set(auth(admin.token)).expect(200);
    expect(approved.body.data.status).toBe("PUBLISHED");
    await ctx.http.get(`${V}/listings/${created.body.data.slug}`).expect(200);

    // Admin action is audited; owner was notified.
    const audit = await ctx.prisma.auditLog.findFirst({ where: { action: "listing.approve", resourceId: id } });
    expect(audit?.actorId).toBe(admin.id);
    expect(await ctx.prisma.notification.count({ where: { userId: owner.id, eventType: "listing.approved" } })).toBe(1);

    // Editing a live listing sends it back to review.
    const edited = await ctx.http.patch(`${V}/listings/${id}`).set(auth(owner.token)).send({ title: "Updated Ugadi Celebration" }).expect(200);
    expect(edited.body.data.status).toBe("PENDING_REVIEW");
  });

  it("requires a business profile for service listings and blocks resource listings", async () => {
    const u = await registerUser(ctx);
    await ctx.http
      .post(`${V}/listings`)
      .set(auth(u.token))
      .send({ categorySlug: "hvac", title: "AC repair test listing", description: "Test listing for air conditioning repair services.", city: "Plano", state: "TX" })
      .expect(403);
    await ctx.http
      .post(`${V}/listings`)
      .set(auth(u.token))
      .send({ categorySlug: "crisis-lines", title: "Fake crisis line", description: "This should never be allowed for regular users.", city: "Plano", state: "TX" })
      .expect(403);
  });

  it("rejects kind-specific details that don't match the category", async () => {
    const u = await registerUser(ctx);
    const res = await ctx.http.post(`${V}/listings`).set(auth(u.token)).send({ ...eventPayload(), categorySlug: "rentals" }).expect(400);
    expect(res.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("onboards a provider into the verification queue and lets admins verify", async () => {
    const u = await registerUser(ctx, "Plumber");
    const admin = await loginDemo(ctx, "admin");
    const p = await ctx.http
      .post(`${V}/providers`)
      .set(auth(u.token))
      .send({
        businessName: "Test Plumbing Co", description: "Licensed plumbing repairs for homes in Collin County.", email: "plumb@test.example",
        phone: "(214) 555-0123", categorySlugs: ["home-services"], languages: ["English", "Hindi"], city: "Allen", state: "TX",
      })
      .expect(201);
    expect(p.body.data.verification).toBe("PENDING");
    await ctx.http.post(`${V}/providers`).set(auth(u.token)).send({ ...p.body.data, categorySlugs: ["home-services"] }).expect((r) => expect([400, 409]).toContain(r.status));

    const queue = await ctx.http.get(`${V}/admin/review-queue`).set(auth(admin.token)).expect(200);
    expect(queue.body.data.providers.some((x: { id: string }) => x.id === p.body.data.id)).toBe(true);
    await ctx.http.post(`${V}/admin/providers/${p.body.data.id}/decision`).set(auth(admin.token)).send({ decision: "APPROVE" }).expect(200);
    const profile = await ctx.http.get(`${V}/providers/${p.body.data.id}`).expect(200);
    expect(profile.body.data.verification).toBe("VERIFIED");

    // The new provider can now create service listings.
    await ctx.http
      .post(`${V}/listings`)
      .set(auth(u.token))
      .send({ categorySlug: "plumbing", title: "Water heater replacement", description: "Same-week water heater replacement and repairs.", city: "Allen", state: "TX" })
      .expect(201);
  });
});

describe("inquiries", () => {
  it("requires consent, notifies the owner, and keeps inquiries private", async () => {
    const provider = await loginDemo(ctx, "provider");
    const requester = await registerUser(ctx, "Requester");
    const stranger = await registerUser(ctx, "Stranger");
    const hvac = await ctx.http.get(`${V}/search`).query({ category: "hvac" }).expect(200);
    const listingId = hvac.body.data[0].id as string;

    await ctx.http.post(`${V}/inquiries`).set(auth(requester.token)).send({ listingId, message: "Can you service my AC this week?" }).expect(400);
    const created = await ctx.http
      .post(`${V}/inquiries`)
      .set(auth(requester.token))
      .send({ listingId, message: "Can you service my AC this week?", consentToShare: true, preferredContact: "PHONE", phone: "214-555-0100" })
      .expect(201);
    const inquiryId = created.body.data.id as string;
    expect(created.body.data.requester).toBeUndefined();
    expect(await ctx.prisma.consentRecord.count({ where: { userId: requester.id, type: "CONTACT_SHARING" } })).toBe(1);

    // Duplicate within 24h is refused.
    await ctx.http.post(`${V}/inquiries`).set(auth(requester.token)).send({ listingId, message: "Following up on my request", consentToShare: true }).expect(409);

    const leads = await ctx.http.get(`${V}/provider/inquiries`).set(auth(provider.token)).expect(200);
    const lead = leads.body.data.find((i: { id: string }) => i.id === inquiryId);
    expect(lead.requester.email).toBe(requester.email);

    // Strangers can neither see nor modify it.
    const strangerLeads = await ctx.http.get(`${V}/provider/inquiries`).set(auth(stranger.token)).expect(200);
    expect(strangerLeads.body.data).toHaveLength(0);
    await ctx.http.patch(`${V}/inquiries/${inquiryId}`).set(auth(stranger.token)).send({ status: "CLOSED" }).expect(404);
    // The requester cannot respond as the provider.
    await ctx.http.patch(`${V}/inquiries/${inquiryId}`).set(auth(requester.token)).send({ providerResponse: "fake reply" }).expect(403);

    await ctx.http.patch(`${V}/inquiries/${inquiryId}`).set(auth(provider.token)).send({ providerResponse: "We can come Thursday at 10am." }).expect(200);
    const mine = await ctx.http.get(`${V}/me/inquiries`).set(auth(requester.token)).expect(200);
    expect(mine.body.data[0]).toMatchObject({ status: "RESPONDED", providerResponse: "We can come Thursday at 10am." });
    expect(await ctx.prisma.notification.count({ where: { userId: requester.id, eventType: "inquiry.responded" } })).toBe(1);
  });
});

describe("jobs and resumes", () => {
  const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");

  it("accepts a PDF resume, blocks duplicates and restricts downloads", async () => {
    const employer = await loginDemo(ctx, "provider");
    const applicant = await registerUser(ctx, "Applicant");
    const stranger = await registerUser(ctx, "Stranger");
    const jobs = await ctx.http.get(`${V}/jobs`).query({ q: "SDET Playwright" }).expect(200);
    const jobId = jobs.body.data[0].id as string;

    await ctx.http
      .post(`${V}/jobs/${jobId}/applications`)
      .set(auth(applicant.token))
      .field("consentToShare", "true")
      .attach("resume", Buffer.from("plain text pretending to be a resume"), { filename: "resume.pdf", contentType: "application/pdf" })
      .expect(400);

    const applied = await ctx.http
      .post(`${V}/jobs/${jobId}/applications`)
      .set(auth(applicant.token))
      .field("consentToShare", "true")
      .field("coverLetter", "Five years of Playwright and REST Assured experience.")
      .attach("resume", pdf, { filename: "asha-resume.pdf", contentType: "application/pdf" })
      .expect(201);
    expect(applied.body.data).toMatchObject({ status: "SUBMITTED", hasResume: true });
    const appId = applied.body.data.id as string;

    await ctx.http.post(`${V}/jobs/${jobId}/applications`).set(auth(applicant.token)).field("consentToShare", "true").expect(409);

    const download = await ctx.http.get(`${V}/applications/${appId}/resume`).set(auth(employer.token)).expect(200);
    expect(download.headers["content-type"]).toContain("application/pdf");
    await ctx.http.get(`${V}/applications/${appId}/resume`).set(auth(stranger.token)).expect(404);
    expect(await ctx.prisma.auditLog.count({ where: { action: "resume.download", actorId: employer.id } })).toBeGreaterThan(0);

    // Status changes: employer moves it forward, applicant may only withdraw.
    await ctx.http.patch(`${V}/applications/${appId}`).set(auth(applicant.token)).send({ status: "OFFERED" }).expect(403);
    await ctx.http.patch(`${V}/applications/${appId}`).set(auth(employer.token)).send({ status: "INTERVIEW" }).expect(200);
    const mine = await ctx.http.get(`${V}/me/applications`).set(auth(applicant.token)).expect(200);
    expect(mine.body.data[0].status).toBe("INTERVIEW");
  });
});

describe("events", () => {
  it("registers attendees and waitlists when capacity is reached", async () => {
    const organizer = await registerUser(ctx, "Organizer");
    const admin = await loginDemo(ctx, "admin");
    const a = await registerUser(ctx, "Attendee A");
    const b = await registerUser(ctx, "Attendee B");
    const created = await ctx.http.post(`${V}/listings`).set(auth(organizer.token)).send(eventPayload({ title: "Capacity test event" })).expect(201);
    const id = created.body.data.id as string;
    await ctx.http.post(`${V}/events/${id}/registrations`).set(auth(a.token)).send({ guests: 1 }).expect(404); // not published yet
    await ctx.http.post(`${V}/admin/listings/${id}/approve`).set(auth(admin.token)).expect(200);

    const first = await ctx.http.post(`${V}/events/${id}/registrations`).set(auth(a.token)).send({ guests: 2 }).expect(201);
    expect(first.body.data.status).toBe("REGISTERED");
    const second = await ctx.http.post(`${V}/events/${id}/registrations`).set(auth(b.token)).send({ guests: 1 }).expect(201);
    expect(second.body.data.status).toBe("WAITLISTED");

    await ctx.http.get(`${V}/events/${id}/registrations`).set(auth(a.token)).expect(404);
    const list = await ctx.http.get(`${V}/events/${id}/registrations`).set(auth(organizer.token)).expect(200);
    expect(list.body.data).toHaveLength(2);
  });
});

describe("favorites, reports and account suspension", () => {
  it("saves listings, accepts reports and blocks suspended users from writing", async () => {
    const admin = await loginDemo(ctx, "admin");
    const u = await registerUser(ctx);
    const any = await ctx.http.get(`${V}/search`).query({ category: "food" }).expect(200);
    const listingId = any.body.data[0].id as string;

    await ctx.http.post(`${V}/me/favorites/${listingId}`).set(auth(u.token)).expect(200);
    const favs = await ctx.http.get(`${V}/me/favorites`).set(auth(u.token)).expect(200);
    expect(favs.body.data[0]).toMatchObject({ id: listingId, isFavorite: true });

    await ctx.http.post(`${V}/reports`).set(auth(u.token)).send({ targetType: "LISTING", targetId: listingId, reason: "SPAM" }).expect(201);
    const reports = await ctx.http.get(`${V}/admin/reports`).set(auth(admin.token)).expect(200);
    expect(reports.body.data.some((r: { targetId: string }) => r.targetId === listingId)).toBe(true);

    await ctx.http.post(`${V}/admin/users/${u.id}/suspend`).set(auth(admin.token)).send({ suspended: true, reason: "Spam" }).expect(200);
    await ctx.http.get(`${V}/me`).set(auth(u.token)).expect(200);
    await ctx.http.delete(`${V}/me/favorites/${listingId}`).set(auth(u.token)).expect(403);
    await ctx.http.post(`${V}/admin/users/${admin.id}/suspend`).set(auth(admin.token)).send({ suspended: true }).expect(400);
  });
});

describe("Desi AI", () => {
  it("answers from the database and flags regulated categories", async () => {
    const res = await ctx.http
      .post(`${V}/ai/chat`)
      .send({ message: "Find Telugu-speaking immigration attorneys near Frisco, Texas." })
      .expect(200);
    expect(res.body.data.results.length).toBeGreaterThan(0);
    expect(res.body.data.results.every((r: { languages: string[] }) => r.languages.includes("Telugu"))).toBe(true);
    expect(res.body.data.safety.type).toBe("regulated");
    expect(res.body.data.searchUrl).toContain("category=immigration");
  });

  it("returns an honest empty answer instead of inventing results", async () => {
    const res = await ctx.http.post(`${V}/ai/chat`).send({ message: "Find Sinhala-speaking dentists in Seattle" }).expect(200);
    expect(res.body.data.results).toHaveLength(0);
    expect(res.body.data.reply).toContain("couldn't find");
    expect(res.body.data.suggestions.length).toBeGreaterThan(0);
  });

  it("routes emergencies to 911/988 without searching", async () => {
    const res = await ctx.http.post(`${V}/ai/chat`).send({ message: "I want to end my life" }).expect(200);
    expect(res.body.data.safety.type).toBe("crisis");
    expect(res.body.data.reply).toContain("988");
    expect(res.body.data.results).toHaveLength(0);
  });

  it("stores history for signed-in users, enforces the daily quota and supports deletion", async () => {
    const u = await registerUser(ctx);
    for (let i = 0; i < 5; i++) {
      await ctx.http.post(`${V}/ai/chat`).set(auth(u.token)).send({ message: "Find caterers in Plano" }).expect(200);
    }
    const limited = await ctx.http.post(`${V}/ai/chat`).set(auth(u.token)).send({ message: "Find caterers in Plano" }).expect(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(await ctx.prisma.aiMessage.count({ where: { conversation: { userId: u.id } } })).toBeGreaterThanOrEqual(10);
    const del = await ctx.http.delete(`${V}/me/ai-history`).set(auth(u.token)).expect(200);
    expect(del.body.data.deletedConversations).toBeGreaterThan(0);
  });
});

describe("push devices", () => {
  it("registers Expo push tokens, moves them between accounts and removes them", async () => {
    const a = await registerUser(ctx, "Phone Owner");
    const b = await registerUser(ctx, "Second Owner");
    const token = `ExponentPushToken[${Date.now()}abcdefghij]`;
    await ctx.http.post(`${V}/me/devices`).set(auth(a.token)).send({ token: "not-a-token", platform: "ios" }).expect(400);
    await ctx.http.post(`${V}/me/devices`).set(auth(a.token)).send({ token, platform: "ios" }).expect(200);
    await ctx.http.post(`${V}/me/devices`).set(auth(b.token)).send({ token, platform: "android" }).expect(200);
    const row = await ctx.prisma.deviceToken.findUniqueOrThrow({ where: { token } });
    expect(row).toMatchObject({ userId: b.id, platform: "android" });
    // The previous owner can't remove a token that is no longer theirs.
    const none = await ctx.http.delete(`${V}/me/devices/${encodeURIComponent(token)}`).set(auth(a.token)).expect(200);
    expect(none.body.data.removed).toBe(0);
    const removed = await ctx.http.delete(`${V}/me/devices/${encodeURIComponent(token)}`).set(auth(b.token)).expect(200);
    expect(removed.body.data.removed).toBe(1);
  });
});

describe("restaurant directory", () => {
  it("lists DFW Indian and Pakistani restaurants as unclaimed listings that can't receive requests", async () => {
    const all = await ctx.http.get(`${V}/search`).query({ category: "restaurants", city: "Dallas", state: "TX", radiusMiles: 100, pageSize: 50 }).expect(200);
    expect(all.body.meta.total).toBeGreaterThan(100);
    const pak = await ctx.http.get(`${V}/search`).query({ category: "restaurants", q: "Pakistani", pageSize: 50 }).expect(200);
    expect(pak.body.meta.total).toBeGreaterThan(15);
    const listing = pak.body.data.find((l: { isDemo: boolean }) => !l.isDemo);
    expect(listing).toMatchObject({ kind: "SERVICE", provider: null, isDemo: false, subcategory: { slug: "restaurants" } });

    const detail = await ctx.http.get(`${V}/listings/${listing.slug}`).expect(200);
    expect(detail.body.data.tags).toContain("Pakistani");
    expect(detail.body.data.description).toMatch(/hasn't claimed or confirmed this listing/);

    const requester = await registerUser(ctx, "Hungry");
    const res = await ctx.http
      .post(`${V}/inquiries`)
      .set(auth(requester.token))
      .send({ listingId: listing.id, message: "Do you cater for 50 people?", consentToShare: true })
      .expect(400);
    expect(res.body.error.message).toMatch(/hasn't claimed/);
  });
});
