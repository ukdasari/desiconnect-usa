import { expect, test } from "@playwright/test";

test("mobile visitors can open the menu, search and reach a listing", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Open menu").click();
  await expect(page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Jobs" })).toBeVisible();
  await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Events" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Events" })).toBeVisible();
  const first = page.getByRole("region", { name: "Results" }).getByRole("article").first();
  await first.getByRole("link").first().click();
  await expect(page).toHaveURL(/\/listings\//);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
