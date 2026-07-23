import type { Page } from "@playwright/test";

export async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("E-mail").fill("technik@maltaman.sk");
  await page.getByLabel("Heslo").fill("maltaman123");
  await page.getByRole("button", { name: "Prihlásiť sa" }).click();
  await page.waitForURL("/");
}

export async function createInspection(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Nová obhliadka" }).click();
  await page.waitForURL(/\/obhliadky\/.+\/zakladne-udaje/);
  const id = page.url().match(/\/obhliadky\/([^/]+)\//)?.[1];
  if (!id) throw new Error("Could not extract inspection id from URL");
  return id;
}
