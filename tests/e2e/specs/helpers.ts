import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "DemoPass123!";

export async function signIn(page: Page, email: string, password = DEMO_PASSWORD, next?: string) {
  await page.goto(`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

export async function registerNewUser(page: Page, name = "E2E Tester") {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.example`;
  await page.goto("/register");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery");
  await page.getByLabel(/I agree to the Terms/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/account/);
  await expect(page.getByRole("heading", { name: /Namaste/ })).toBeVisible();
  return email;
}

/** Opens the first listing on a results page. */
export async function openFirstResult(page: Page) {
  const link = page.getByRole("region", { name: "Results" }).getByRole("article").first().getByRole("link").first();
  await link.click();
  await page.waitForURL(/\/listings\//);
}
