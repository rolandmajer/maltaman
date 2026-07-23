import { test, expect } from "@playwright/test";
import { login, createInspection } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("Offline draft recovery and photo attachment", () => {
  let inspectionId: string;

  test("edits made while offline are queued, shown as locally saved, and survive a reload after reconnecting", async ({
    page,
    context,
  }) => {
    await login(page);
    inspectionId = await createInspection(page);

    await context.setOffline(true);

    // protocolNumber is unique per organisation — use a run-specific value so repeated test runs
    // never collide with a number a previous run already persisted.
    const uniqueProtocolNumber = `PZ-OFFLINE-TEST-${Date.now()}`;
    await page.getByLabel("Číslo protokolu").fill(uniqueProtocolNumber);
    await page.getByLabel("Číslo protokolu").blur();
    await page.waitForTimeout(900); // debounce window before the save attempt fires

    await expect(page.getByText(/Uložené v zariadení|Bez pripojenia/).first()).toBeVisible({ timeout: 5_000 });
    // The edit is applied optimistically to local state (and the IndexedDB cache) immediately,
    // without waiting for the network — this is what makes the field editable at all while offline.
    await expect(page.getByLabel("Číslo protokolu")).toHaveValue(uniqueProtocolNumber);

    // Reconnect and let the queued mutation flush to the server. The badge polls every 5s as a
    // backup to the 'online' event listener, so give it a generous window before checking.
    await context.setOffline(false);
    await expect(page.getByText("Synchronizované").first()).toBeVisible({ timeout: 20_000 });

    // A fresh load now reads the authoritative, synced server value — the real proof the queued
    // PATCH actually reached the database, not just that the badge changed.
    await page.reload();
    await expect(page.getByLabel("Číslo protokolu")).toHaveValue(uniqueProtocolNumber);
  });

  test("a photo can be uploaded and appears in the Fotodokumentácia grid", async ({ page }) => {
    await login(page);
    await page.goto(`/obhliadky/${inspectionId}/foto`);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: "test-photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64"
      ),
    });

    await expect(page.getByRole("heading", { name: /Fotografie \(1\)/ })).toBeVisible({ timeout: 10_000 });
  });
});
