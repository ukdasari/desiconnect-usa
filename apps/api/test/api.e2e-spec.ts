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

describe("account deletion", () => {
  it("deletes personal data, signs the person out, frees the email and keeps others' records consistent", async () => {
    const employer = await loginDemo(ctx, "provider");
    const u = await registerUser(ctx, "Leaving Soon");
    const hvac = (await ctx.http.get(`${V}/search`).query({ category: "hvac" }).expect(200)).body.data[0];
    await ctx.http.post(`${V}/inquiries`).set(auth(u.token)).send({ listingId: hvac.id, message: "Please call me about AC service.", consentToShare: true, phone: "214-555-0177" }).expect(201);
    await ctx.http.post(`${V}/me/favorites/${hvac.id}`).set(auth(u.token)).expect((r) => expect([200, 201]).toContain(r.status));
    const job = (await ctx.http.get(`${V}/jobs`).query({ q: "SDET Playwright" }).expect(200)).body.data[0];
    const pdf = Buffer.from("%PDF-1.4\n%demo resume\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF");
    await ctx.http.post(`${V}/jobs/${job.id}/applications`).set(auth(u.token)).field("consentToShare", "true").attach("resume", pdf, { filename: "cv.pdf", contentType: "application/pdf" }).expect(201);
    const resumeKey = (await ctx.prisma.attachment.findFirstOrThrow({ where: { ownerId: u.id } })).storageKey;

    // Confirmation is required.
    await ctx.http.delete(`${V}/me`).set(auth(u.token)).send({}).expect(400);
    await ctx.http.delete(`${V}/me`).set(auth(u.token)).send({ confirm: "DELETE" }).expect(200);

    // Signed out everywhere, and the email can be used again.
    await ctx.http.get(`${V}/me`).set(auth(u.token)).expect(401);
    await ctx.http.post(`${V}/auth/login`).send({ email: u.email, password: "correct-horse-battery" }).expect(401);
    await ctx.http.post(`${V}/auth/register`).send({ name: "Back Again", email: u.email, password: "correct-horse-battery" }).expect(201);

    // Personal data is gone; the scrubbed row keeps foreign keys valid.
    const row = await ctx.prisma.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(row).toMatchObject({ name: null, phone: null, city: null });
    expect(row.deletedAt).not.toBeNull();
    expect(row.email).not.toBe(u.email);
    for (const count of [
      ctx.prisma.inquiry.count({ where: { requesterId: u.id } }),
      ctx.prisma.jobApplication.count({ where: { applicantId: u.id } }),
      ctx.prisma.favorite.count({ where: { userId: u.id } }),
      ctx.prisma.attachment.count({ where: { ownerId: u.id } }),
      ctx.prisma.localCredential.count({ where: { userId: u.id } }),
    ]) expect(await count).toBe(0);
    await expect(ctx.storage.get(resumeKey)).rejects.toThrow();
    const leads = await ctx.http.get(`${V}/provider/inquiries`).set(auth(employer.token)).expect(200);
    expect(leads.body.data.some((i: { message: string }) => i.message === "Please call me about AC service.")).toBe(false);
    expect(await ctx.prisma.auditLog.count({ where: { action: "user.delete", resourceId: u.id } })).toBe(1);
  });

  it("takes a business's listings down and won't remove the last admin", async () => {
    const owner = await registerUser(ctx, "Closing Shop");
    await ctx.http
      .post(`${V}/providers`)
      .set(auth(owner.token))
      .send({
        businessName: "Closing Shop Plumbing", description: "Licensed plumbing repairs for homes in Collin County.", email: "closing@test.example",
        phone: "(214) 555-0188", categorySlugs: ["home-services"], languages: ["English"], city: "Allen", state: "TX",
      })
      .expect(201);
    const listing = await ctx.http.post(`${V}/listings`).set(auth(owner.token)).send({ ...eventPayload(), title: "Closing Shop tasting day" }).expect(201);
    await ctx.http.delete(`${V}/me`).set(auth(owner.token)).send({ confirm: "DELETE" }).expect(200);
    const l = await ctx.prisma.listing.findUniqueOrThrow({ where: { id: listing.body.data.id } });
    expect(l.deletedAt).not.toBeNull();
    expect((await ctx.prisma.provider.findFirstOrThrow({ where: { ownerId: owner.id } })).deletedAt).not.toBeNull();

    const admin = await loginDemo(ctx, "admin");
    const res = await ctx.http.delete(`${V}/me`).set(auth(admin.token)).send({ confirm: "DELETE" }).expect(400);
    expect(res.body.error.message).toMatch(/only admin/);
  });
});

describe("listing claims", () => {
  async function business(name: string) {
    const u = await registerUser(ctx, name);
    await ctx.http
      .post(`${V}/providers`)
      .set(auth(u.token))
      .send({
        businessName: `${name} LLC`, description: "We run an Indian restaurant in the Dallas area.", email: `${u.email}`,
        phone: "(214) 555-0101", categorySlugs: ["home-services"], languages: ["English"], city: "Irving", state: "TX",
      })
      .expect(201);
    return u;
  }

  it("lets a business claim an unclaimed listing and transfers it when an admin confirms", async () => {
    const found = await ctx.http.get(`${V}/search`).query({ category: "restaurants", q: "Indian", pageSize: 50 }).expect(200);
    const listing = found.body.data.filter((l: { isDemo: boolean }) => !l.isDemo).at(-1);
    const body = { role: "Owner", phone: "214-555-0110", verification: "Call the restaurant and ask for the owner." };

    // Needs a business profile first.
    const nobody = await registerUser(ctx, "No Business");
    const noProfile = await ctx.http.post(`${V}/listings/${listing.id}/claims`).set(auth(nobody.token)).send(body).expect(400);
    expect(noProfile.body.error.message).toMatch(/business profile/);

    const a = await business("Real Owner");
    const b = await business("Other Claimant");
    await ctx.http.post(`${V}/listings/${listing.id}/claims`).set(auth(a.token)).send({ role: "x", phone: "1" }).expect(400);
    const claim = await ctx.http.post(`${V}/listings/${listing.id}/claims`).set(auth(a.token)).send(body).expect(201);
    expect(claim.body.data).toMatchObject({ status: "PENDING", listing: { id: listing.id } });
    await ctx.http.post(`${V}/listings/${listing.id}/claims`).set(auth(a.token)).send(body).expect(409);
    const other = await ctx.http.post(`${V}/listings/${listing.id}/claims`).set(auth(b.token)).send({ role: "Manager", phone: "214-555-0111" }).expect(201);

    const mine = await ctx.http.get(`${V}/me/claims`).set(auth(a.token)).expect(200);
    expect(mine.body.data.map((c: { id: string }) => c.id)).toEqual([claim.body.data.id]);

    const admin = await loginDemo(ctx, "admin");
    const queue = await ctx.http.get(`${V}/admin/review-queue`).set(auth(admin.token)).expect(200);
    expect(queue.body.data.claims.find((c: { id: string }) => c.id === claim.body.data.id)).toMatchObject({ claimantEmail: a.email, businessName: "Real Owner LLC" });
    await ctx.http.post(`${V}/admin/claims/${claim.body.data.id}/decision`).set(auth(a.token)).send({ decision: "APPROVE" }).expect(403);
    await ctx.http.post(`${V}/admin/claims/${claim.body.data.id}/decision`).set(auth(admin.token)).send({ decision: "REJECT" }).expect(400);
    await ctx.http.post(`${V}/admin/claims/${claim.body.data.id}/decision`).set(auth(admin.token)).send({ decision: "APPROVE" }).expect(200);

    // The listing now belongs to the claimant's business and accepts requests.
    const detail = await ctx.http.get(`${V}/listings/${listing.slug}`).expect(200);
    expect(detail.body.data.provider).toMatchObject({ businessName: "Real Owner LLC" });
    const requester = await registerUser(ctx, "Hungry Again");
    await ctx.http.post(`${V}/inquiries`).set(auth(requester.token)).send({ listingId: listing.id, message: "Do you cater for 50 people?", consentToShare: true }).expect(201);
    const dash = await ctx.http.get(`${V}/provider/dashboard`).set(auth(a.token)).expect(200);
    expect(dash.body.data.listings.some((l: { id: string }) => l.id === listing.id)).toBe(true);

    // The competing claim is closed, and the listing can't be claimed again.
    expect((await ctx.prisma.listingClaim.findUniqueOrThrow({ where: { id: other.body.data.id } })).status).toBe("REJECTED");
    await ctx.http.post(`${V}/listings/${listing.id}/claims`).set(auth(b.token)).send(body).expect(409);
    expect(await ctx.prisma.notification.count({ where: { userId: a.id, eventType: "claim.approved" } })).toBe(1);
    expect(await ctx.prisma.auditLog.count({ where: { action: "claim.approve", resourceId: claim.body.data.id } })).toBe(1);
  });

  it("lets a claimant withdraw a pending claim", async () => {
    const found = await ctx.http.get(`${V}/search`).query({ category: "restaurants", q: "Pakistani", pageSize: 50 }).expect(200);
    const listing = found.body.data.filter((l: { isDemo: boolean }) => !l.isDemo).at(-1);
    const a = await business("Changed Mind");
    const claim = await ctx.http.post(`${V}/listings/${listing.id}/claims`).set(auth(a.token)).send({ role: "Owner", phone: "214-555-0112" }).expect(201);
    const w = await ctx.http.post(`${V}/me/claims/${claim.body.data.id}/withdraw`).set(auth(a.token)).expect(200);
    expect(w.body.data.status).toBe("WITHDRAWN");
    await ctx.http.post(`${V}/me/claims/${claim.body.data.id}/withdraw`).set(auth(a.token)).expect(409);
  });
});

describe("search across several categories", () => {
  it("returns listings from any of the given categories, and rejects malformed lists", async () => {
    const both = await ctx.http.get(`${V}/search`).query({ category: "lawyers,immigration", anywhere: "1", pageSize: 50 }).expect(200);
    const imm = await ctx.http.get(`${V}/search`).query({ category: "immigration", anywhere: "1", pageSize: 50 }).expect(200);
    const law = await ctx.http.get(`${V}/search`).query({ category: "lawyers", anywhere: "1", pageSize: 50 }).expect(200);
    expect(imm.body.meta.total + law.body.meta.total).toBeGreaterThan(0);
    expect(both.body.meta.total).toBe(imm.body.meta.total + law.body.meta.total);
    await ctx.http.get(`${V}/search`).query({ category: "lawyers,,immigration" }).expect(400);
    await ctx.http.get(`${V}/search`).query({ category: "a,b,c,d,e,f" }).expect(400);
  });
});

describe("alerts", () => {
  const KEY = "test-internal-key-0123456789abcdef";

  async function publishEvent(title: string, city = "Plano") {
    const owner = await registerUser(ctx, "Organizer");
    const admin = await loginDemo(ctx, "admin");
    const created = await ctx.http.post(`${V}/listings`).set(auth(owner.token)).send(eventPayload({ title, city })).expect(201);
    await ctx.http.post(`${V}/admin/listings/${created.body.data.id}/approve`).set(auth(admin.token)).expect(200);
    return created.body.data as { id: string; slug: string };
  }

  it("creates, lists, updates and removes alerts, with sensible defaults and validation", async () => {
    const u = await registerUser(ctx, "Alert Fan");
    const ev = await ctx.http.post(`${V}/me/alerts`).set(auth(u.token)).send({ topic: "events", city: "Plano", state: "TX", radiusMiles: 15 }).expect(201);
    expect(ev.body.data).toMatchObject({ topic: "events", topicLabel: "Events", frequency: "INSTANT", radiusMiles: 15 });
    expect(ev.body.data.locationLabel).toMatch(/Plano/);
    const att = await ctx.http.post(`${V}/me/alerts`).set(auth(u.token)).send({ topic: "attorneys" }).expect(201);
    expect(att.body.data).toMatchObject({ frequency: "WEEKLY", locationLabel: null });
    await ctx.http.post(`${V}/me/alerts`).set(auth(u.token)).send({ topic: "events", city: "Plano", state: "TX", radiusMiles: 15 }).expect(409);
    await ctx.http.post(`${V}/me/alerts`).set(auth(u.token)).send({ topic: "pets" }).expect(400);
    await ctx.http.post(`${V}/me/alerts`).set(auth(u.token)).send({ topic: "jobs", zip: "123" }).expect(400);

    await ctx.http.patch(`${V}/me/alerts/${att.body.data.id}`).set(auth(u.token)).send({ frequency: "INSTANT" }).expect(200);
    const other = await registerUser(ctx, "Nosy");
    await ctx.http.delete(`${V}/me/alerts/${att.body.data.id}`).set(auth(other.token)).expect(404);
    await ctx.http.delete(`${V}/me/alerts/${att.body.data.id}`).set(auth(u.token)).expect(200);
    const list = await ctx.http.get(`${V}/me/alerts`).set(auth(u.token)).expect(200);
    expect(list.body.data.map((a: { topic: string }) => a.topic)).toEqual(["events"]);
    await ctx.http.get(`${V}/me/alerts`).expect(401);
  });

  it("sends instant alerts to nearby followers when a listing is first published", async () => {
    const near = await registerUser(ctx, "Near Fan");
    const far = await registerUser(ctx, "Far Fan");
    const weekly = await registerUser(ctx, "Weekly Fan");
    await ctx.http.post(`${V}/me/alerts`).set(auth(near.token)).send({ topic: "events", city: "Plano", state: "TX", radiusMiles: 10 }).expect(201);
    await ctx.http.post(`${V}/me/alerts`).set(auth(far.token)).send({ topic: "events", city: "Houston", state: "TX", radiusMiles: 25 }).expect(201);
    await ctx.http.post(`${V}/me/alerts`).set(auth(weekly.token)).send({ topic: "events", frequency: "WEEKLY" }).expect(201);

    const listing = await publishEvent("Plano Diwali Mela for alerts");
    const got = (u: { id: string }) => ctx.prisma.notification.findMany({ where: { userId: u.id, eventType: "alert.match" } });
    const nearN = await got(near);
    expect(nearN).toHaveLength(1);
    expect(nearN[0]!.title).toContain("Plano Diwali Mela for alerts");
    expect(nearN[0]!.body).toContain(`https://desiconnect.test/listings/${listing.slug}`);
    expect(await got(far)).toHaveLength(0);
    expect(await got(weekly)).toHaveLength(0);

    // Turning off alert emails and push keeps the in-app alert.
    await ctx.http.patch(`${V}/me/notification-settings`).set(auth(near.token)).send({ alertEmails: false, alertPush: false }).expect(200);
    const s = await ctx.http.get(`${V}/me/notification-settings`).set(auth(near.token)).expect(200);
    expect(s.body.data).toMatchObject({ alertEmails: false, alertPush: false });
    await publishEvent("Second Plano event for alerts");
    expect(await got(near)).toHaveLength(2);
  });

  it("builds one weekly digest per user from new matching listings, then waits a week", async () => {
    const u = await registerUser(ctx, "Digest Fan");
    const created = await ctx.http.post(`${V}/me/alerts`).set(auth(u.token)).send({ topic: "events", city: "Plano", state: "TX", radiusMiles: 30, frequency: "WEEKLY" }).expect(201);
    await ctx.http.post(`${V}/me/alerts`).set(auth(u.token)).send({ topic: "everything", frequency: "WEEKLY" }).expect(201);
    // Pretend the alerts were made a week ago so the digest is due.
    const weekAgo = new Date(Date.now() - 8 * 86_400_000);
    await ctx.prisma.alert.updateMany({ where: { userId: u.id }, data: { lastDigestAt: weekAgo, createdAt: weekAgo } });
    await publishEvent("Digest garba night");

    await ctx.http.post(`${V}/internal/alerts/digest`).expect(403);
    await ctx.http.post(`${V}/internal/alerts/digest`).set("x-internal-key", "wrong-key-wrong-key-wrong-key-wrong").expect(403);
    const res = await ctx.http.post(`${V}/internal/alerts/digest`).set("x-internal-key", KEY).expect(200);
    expect(res.body.data.users).toBeGreaterThanOrEqual(1);
    const digests = await ctx.prisma.notification.findMany({ where: { userId: u.id, eventType: "alert.digest" } });
    expect(digests).toHaveLength(1);
    expect(digests[0]!.body).toContain("Events near");

    // Not due again until next week.
    await ctx.http.post(`${V}/internal/alerts/digest`).set("x-internal-key", KEY).expect(200);
    expect(await ctx.prisma.notification.count({ where: { userId: u.id, eventType: "alert.digest" } })).toBe(1);
    expect((await ctx.prisma.alert.findUniqueOrThrow({ where: { id: created.body.data.id } })).lastDigestAt!.getTime()).toBeGreaterThan(weekAgo.getTime());
  });

  it("unsubscribes from alert emails with the signed link, and rejects forged tokens", async () => {
    const u = await registerUser(ctx, "Unsub Fan");
    const { EmailService } = await import("../src/notifications/email.service");
    const token = ctx.app.get(EmailService).unsubscribeToken(u.id);
    await ctx.http.post(`${V}/alerts/unsubscribe`).send({ token: `${u.id}.forgedsignature` }).expect(400);
    await ctx.http.post(`${V}/alerts/unsubscribe`).send({ token }).expect(200);
    expect((await ctx.prisma.user.findUniqueOrThrow({ where: { id: u.id } })).alertEmails).toBe(false);
  });
});
