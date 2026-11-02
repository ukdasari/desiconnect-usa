// OIDC journeys. Run with the stack in OIDC mode against the local dev provider:
//   OIDC_DEV_ACCESS_TTL=65 pnpm oidc:dev     (short access tokens so refresh can be observed)
//   AUTH_MODE=oidc … API and web             (see docs/security/authentication.md)
//   E2E_AUTH_MODE=oidc pnpm test:e2e
import { expect, test, type Page } from "@playwright/test";

test.skip(process.env.E2E_AUTH_MODE !== "oidc", "OIDC journeys run only when E2E_AUTH_MODE=oidc");

async function providerSignIn(page: Page, login: string) {
  await expect(page).toHaveURL(/:4400\//);
  await page.locator("input[name=login]").fill(login);
  await page.locator("input[name=password]").fill("any-password");
  await page.locator("button[type=submit]").click();
  // The dev provider asks once for API consent; hosted providers skip this for first-party apps.
  const consent = page.getByRole("button", { name: "Continue" });
  if (await consent.isVisible({ timeout: 3000 }).catch(() => false)) await consent.click();
}

const unique = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e5)}@example.com`;

test("signs up through the provider and returns to the requested page", async ({ page }) => {
  await page.goto("/account/requests");
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.locator("main").getByRole("link", { name: "Sign in", exact: true }).click();
  await providerSignIn(page, unique("lakshmi"));
  await expect(page).toHaveURL(/\/account\/requests$/);
  await expect(page.getByRole("heading", { name: "My requests" })).toBeVisible();

  const cookies = await page.context().cookies("http://localhost:3000");
  for (const name of ["dc_session", "dc_refresh", "dc_exp", "dc_idt"]) {
    const c = cookies.find((x) => x.name === name);
    expect(c, name).toBeTruthy();
    expect(c!.httpOnly, `${name} must be httpOnly`).toBe(true);
  }
});

test("a signed-in OIDC user can act (send a request)", async ({ page }) => {
  await page.goto("/auth/login?next=/c/food");
  await providerSignIn(page, unique("arjun"));
  await expect(page).toHaveURL(/\/c\/food/);
  await page.getByRole("region", { name: "Results" }).getByRole("article").first().getByRole("link").first().click();
  await page.getByLabel("What do you need?").fill("Do you cater for 150 guests in Plano next month?");
  await page.getByLabel(/Share my name, email/).check();
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText(/Request sent/)).toBeVisible();
});

test("refreshes an expiring access token without signing the user out", async ({ page }) => {
  await page.goto("/auth/login?next=/account");
  await providerSignIn(page, unique("refresh"));
  await expect(page.getByRole("heading", { name: /Namaste/ })).toBeVisible();
  const before = (await page.context().cookies()).find((c) => c.name === "dc_session")!.value;
  const exp = Number((await page.context().cookies()).find((c) => c.name === "dc_exp")!.value);
  // Wait until the token is inside the refresh window (60 s before expiry).
  const waitMs = Math.max(0, (exp - 60) * 1000 - Date.now()) + 1500;
  test.skip(waitMs > 20_000, "Start the dev provider with OIDC_DEV_ACCESS_TTL=65 to test refresh quickly");
  await page.waitForTimeout(waitMs);
  await page.reload();
  await expect(page.getByRole("heading", { name: /Namaste/ })).toBeVisible();
  const after = (await page.context().cookies()).find((c) => c.name === "dc_session")!.value;
  expect(after).not.toBe(before);
});

test("sign out ends the provider session too", async ({ page }) => {
  await page.goto("/auth/login?next=/account");
  await providerSignIn(page, unique("logout"));
  await expect(page.getByRole("heading", { name: /Namaste/ })).toBeVisible();
  await page.getByLabel("Account menu").click();
  await page.getByRole("button", { name: "Sign out" }).click();
  // The dev provider asks to confirm RP-initiated logout.
  await page.waitForURL(/:4400\/session\/end/);
  await page.getByRole("button", { name: /yes|sign me out/i }).click();
  await expect(page).toHaveURL(/localhost:3000\/?$/);
  expect((await page.context().cookies()).find((c) => c.name === "dc_session")).toBeUndefined();
  // Signing in again requires credentials (no silent re-login).
  await page.goto("/auth/login?next=/account");
  await expect(page.locator("input[name=login]")).toBeVisible();
});

test("an identity with an unverified email is refused with a clear message", async ({ page }) => {
  await page.goto("/auth/login?next=/account");
  await providerSignIn(page, `unverified-${Date.now()}`);
  await expect(page).toHaveURL(/\/login\?error=email_unverified/);
  await expect(page.getByText("Verify your email address with your sign-in provider")).toBeVisible();
});
