import { expect, test } from "@playwright/test";
import { openFirstResult, registerNewUser, signIn } from "./helpers";

// These journeys use the local email/password demo accounts.
test.skip(process.env.E2E_AUTH_MODE === "oidc", "Local-auth journeys; OIDC journeys live in oidc.spec.ts");

test.describe("discovery", () => {
  test("homepage sentence search turns plain language into filtered results", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByLabel("What do you need?").fill("Telugu-speaking immigration attorney");
    await page.getByLabel("Near which city or ZIP code?").fill("Frisco");
    await page.getByRole("button", { name: "Search" }).click();
    await page.waitForURL(/\/search\?/);
    expect(page.url()).toContain("category=immigration");
    expect(page.url()).toContain("language=Telugu");
    await expect(page.getByText(/results? within \d+ miles of Frisco, TX/)).toBeVisible();
    const rows = page.getByRole("region", { name: "Results" }).getByRole("article");
    await expect(rows.first()).toBeVisible();
    await expect(rows.first()).toContainText("Telugu");
  });

  test("all 15 categories are reachable from the homepage", async ({ page }) => {
    await page.goto("/");
    const index = page.locator("section", { has: page.getByRole("heading", { name: "Browse by what you need" }) });
    await expect(index.getByRole("listitem")).toHaveCount(15);
    await index.getByRole("link", { name: /Home Services/ }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Home Services" })).toBeVisible();
    await page.getByRole("link", { name: "HVAC", exact: true }).click();
    await expect(page.getByRole("region", { name: "Results" }).getByRole("article").first()).toContainText(/AC repair/);
  });

  test("filters narrow results and empty states explain what to do", async ({ page }) => {
    await page.goto("/real-estate?transactionType=RENT&maxPrice=2500&city=Prosper&state=TX&radiusMiles=10");
    const rows = page.getByRole("region", { name: "Results" }).getByRole("article");
    await expect(rows.first()).toContainText("Prosper");
    await page.goto("/search?q=zzznomatchzzz&anywhere=1");
    await expect(page.getByText("Nothing matches these filters yet")).toBeVisible();
    await expect(page.getByRole("link", { name: "Search the whole USA" })).toBeVisible();
  });

  test("regulated categories show the license disclaimer", async ({ page }) => {
    await page.goto("/c/lawyers");
    await expect(page.getByText("Check credentials before you hire")).toBeVisible();
    await openFirstResult(page);
    await expect(page.getByRole("heading", { name: "Licenses and verification" })).toBeVisible();
    await expect(page.getByText("This is demonstration content")).toBeVisible();
  });

  test("emergency page puts 911 first", async ({ page }) => {
    await page.goto("/emergency");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("call 911");
    await expect(page.getByRole("link", { name: /Call 911/ })).toHaveAttribute("href", "tel:911");
    await expect(page.getByRole("link", { name: /988/ }).first()).toHaveAttribute("href", "tel:988");
  });
});

test.describe("Desi AI", () => {
  test("answers with real listings and an honest empty result", async ({ page }) => {
    await page.goto("/ai");
    const input = page.getByLabel("Ask Desi AI");
    await input.fill("Find a rental home in Prosper under $2,500");
    await page.getByRole("button", { name: "Send" }).click();
    const log = page.getByRole("log");
    await expect(log.getByText(/I found \d+ match/)).toBeVisible();
    await expect(log.getByRole("link", { name: /Prosper ISD/ })).toBeVisible();

    await input.fill("Find Sinhala-speaking dentists in Seattle");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(log.getByText(/couldn't find any published dentists/)).toBeVisible();
  });

  test("routes crisis messages to 988 instead of searching", async ({ page }) => {
    await page.goto("/ai");
    await page.getByLabel("Ask Desi AI").fill("I want to end my life");
    await page.getByRole("button", { name: "Send" }).click();
    const alert = page.getByRole("log").getByRole("alert");
    await expect(alert).toContainText("988");
    await expect(alert.getByRole("link", { name: "Call or text 988" })).toBeVisible();
  });
});

test.describe("accounts and actions", () => {
  test("private pages redirect to sign-in and come back afterwards", async ({ page }) => {
    await page.goto("/account/requests");
    await expect(page).toHaveURL(/\/login\?next=%2Faccount%2Frequests/);
    await page.getByLabel("Email").fill("user@desiconnect.example");
    await page.getByLabel("Password").fill("DemoPass123!");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/account\/requests$/);
    await expect(page.getByRole("heading", { name: "My requests" })).toBeVisible();
  });

  test("a new user requests a service with consent and tracks it", async ({ page }) => {
    await registerNewUser(page, "Priya Test");
    await page.goto("/search?category=catering&anywhere=1");
    await openFirstResult(page);
    await page.getByRole("button", { name: "Send request" }).click(); // blocked: consent + message missing
    await page.getByLabel("What do you need?").fill("Catering for 200 guests on Saturday, vegetarian menu please.");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText(/You must agree to share|Check the highlighted fields/).first()).toBeVisible();
    await page.getByLabel(/Share my name, email/).check();
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText(/Request sent/)).toBeVisible();

    await page.goto("/account/requests");
    await expect(page.getByText("Catering for 200 guests on Saturday")).toBeVisible();
  });

  test("a job seeker applies with a PDF resume", async ({ page }) => {
    await registerNewUser(page, "Ravi Applicant");
    await page.goto("/jobs?q=Data%20Engineer&anywhere=1");
    await openFirstResult(page);
    await page.getByRole("link", { name: "Apply now" }).click();
    await expect(page.getByRole("heading", { name: /^Apply:/ })).toBeVisible();
    await page.getByLabel("Resume", { exact: true }).setInputFiles({
      name: "ravi-resume.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"),
    });
    await page.getByLabel(/Cover note/).fill("Six years building Spark and Airflow pipelines.");
    await page.getByLabel(/Share my application/).check();
    await page.getByRole("button", { name: "Submit application" }).click();
    await expect(page.getByText(/Application submitted/)).toBeVisible();
    await page.goto("/account/requests");
    await expect(page.locator("section", { has: page.getByRole("heading", { name: /Job applications/ }) }).getByText("Senior Data Engineer")).toBeVisible();
  });

  test("a member RSVPs to an event", async ({ page }) => {
    await registerNewUser(page, "Meena Guest");
    await page.goto("/events?anywhere=1");
    await openFirstResult(page);
    await page.getByLabel("How many people, including you?").selectOption("2");
    await page.getByRole("button", { name: /RSVP|Join the waitlist/ }).click();
    await expect(page.getByText(/You're registered|on the waitlist/)).toBeVisible();
  });

  test("saving a listing adds it to Saved", async ({ page }) => {
    await registerNewUser(page, "Saver");
    await page.goto("/c/education");
    const first = page.getByRole("region", { name: "Results" }).getByRole("article").first();
    const title = (await first.getByRole("heading").textContent())!.trim();
    await first.getByRole("button", { name: /^Save / }).click();
    await page.goto("/account/saved");
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
  });
});

test.describe("organizer → moderation → publish", () => {
  test("an organizer posts an event, an admin approves it, and it goes live", async ({ browser }) => {
    const title = `E2E Sankranti Kite Festival ${Date.now()}`;
    const organizer = await browser.newPage();
    await registerNewUser(organizer, "Org Anizer");
    await organizer.goto("/provider/listings/new?category=festivals");
    await organizer.getByLabel("Event name").fill(title);
    await organizer.getByLabel("Description").fill("Kite flying, til laddoos and music for families. Bring your own kite or buy one there.");
    const start = new Date(Date.now() + 14 * 86_400_000);
    await organizer.getByLabel("Starts (Central time)").fill(`${start.toISOString().slice(0, 10)}T10:00`);
    await organizer.getByLabel("Venue").fill("E2E Community Park");
    await organizer.getByRole("textbox", { name: /^City/ }).fill("Frisco");
    await organizer.getByRole("button", { name: "Submit for review" }).click();
    await organizer.waitForURL(/\/provider\/listings\/.+\?created=1/);
    await expect(organizer.getByText("Submitted for review")).toBeVisible();

    // Not public yet.
    const anon = await browser.newPage();
    await anon.goto(`/search?q=${encodeURIComponent(title)}&anywhere=1`);
    await expect(anon.getByText("Nothing matches these filters yet")).toBeVisible();

    const admin = await browser.newPage();
    await signIn(admin, "admin@desiconnect.example");
    await admin.goto("/admin");
    const item = admin.getByRole("listitem").filter({ hasText: title });
    await item.getByRole("button", { name: "Approve" }).click();
    // Approved items leave the queue once the page revalidates.
    await expect(item).toHaveCount(0);

    await anon.goto(`/events?q=${encodeURIComponent(title)}&anywhere=1`);
    await expect(anon.getByRole("heading", { name: title })).toBeVisible();
  });

  test("members cannot open the moderation dashboard", async ({ page }) => {
    await signIn(page, "user@desiconnect.example");
    // Next streams the page, so the status is 200, but the user sees the not-found page and no admin data.
    // The API independently rejects every /admin request from non-admins (covered by API e2e tests).
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "We couldn’t find that page" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Moderation" })).toHaveCount(0);
  });
});

test.describe("account deletion", () => {
  test("a member deletes their account from the account page", async ({ page }) => {
    const email = await registerNewUser(page, "Short Stay");
    await page.goto("/account#delete-account");
    const button = page.getByRole("button", { name: "Delete my account" });
    await page.getByLabel("Type DELETE to confirm").fill("delete");
    await button.click();
    await expect(page.getByRole("heading", { name: "Your account has been deleted" })).toHaveCount(0);
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await button.click();
    await expect(page.getByRole("heading", { name: "Your account has been deleted" })).toBeVisible();
    // Signed out: private pages send you to sign-in, and the old password no longer works.
    await page.goto("/account");
    await expect(page).toHaveURL(/\/login/);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correct-horse-battery");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText(/incorrect|didn.t match|invalid/i)).toBeVisible();
  });
});

test.describe("listing claims", () => {
  test("a business claims a restaurant listing and an admin confirms it", async ({ browser, request }) => {
    const api = process.env.E2E_API_URL ?? "http://localhost:4000/api/v1";
    const res = await request.get(`${api}/search`, { params: { category: "restaurants", pageSize: 50 } });
    const open = ((await res.json()).data as { slug: string; title: string; provider: unknown; isDemo: boolean }[]).filter((l) => !l.provider && !l.isDemo);
    const listing = open[Math.floor(Math.random() * open.length)];

    const owner = await browser.newPage();
    await signIn(owner, "provider@desiconnect.example");
    await owner.goto(`/listings/${listing.slug}`);
    await owner.getByRole("link", { name: "Claim this listing" }).click();
    await expect(owner.getByRole("heading", { name: `Claim ${listing.title}` })).toBeVisible();
    await owner.getByLabel("Your role at the business").fill("Owner");
    await owner.getByLabel("Phone we can reach you on").fill("214-555-0142");
    await owner.getByRole("button", { name: "Send claim" }).click();
    await expect(owner.getByText(/Claim sent|Claim waiting for review/).first()).toBeVisible();
    await owner.goto("/provider");
    await expect(owner.getByRole("region", { name: "Listing claims" }).getByText(listing.title)).toBeVisible();

    const admin = await browser.newPage();
    await signIn(admin, "admin@desiconnect.example");
    await admin.goto("/admin");
    const item = admin.getByRole("listitem").filter({ hasText: listing.title }).filter({ hasText: "Owner at" });
    await item.getByRole("button", { name: "Approve" }).click();
    await expect(item).toHaveCount(0);

    // The listing now takes requests through the claimant's business.
    await owner.goto(`/listings/${listing.slug}`);
    await expect(owner.getByRole("heading", { name: "Not claimed yet" })).toHaveCount(0);
  });
});
