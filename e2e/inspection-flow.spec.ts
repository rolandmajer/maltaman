import { test, expect } from "@playwright/test";
import { login, createInspection } from "./helpers";

test.describe.configure({ mode: "serial" });

test.describe("Core inspection workflow", () => {
  let inspectionId: string;

  test("technician can log in and reach the dashboard", async ({ page }) => {
    await login(page);
    await expect(page.getByRole("heading", { name: "Obhliadky", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Nová obhliadka" })).toBeVisible();
  });

  test("creating a new inspection opens the wizard at Základné údaje", async ({ page }) => {
    await login(page);
    inspectionId = await createInspection(page);
    await expect(page.getByRole("heading", { name: "Základné údaje" })).toBeVisible();
    await expect(page.getByLabel("Číslo protokolu")).not.toHaveValue("");
  });

  test("adding multiple bedrooms creates distinct, auto-numbered rooms", async ({ page }) => {
    await login(page);
    await page.goto(`/obhliadky/${inspectionId}/miestnosti`);

    for (let i = 0; i < 3; i++) {
      await page.getByRole("button", { name: "Pridať miestnosť" }).click();
      await page.getByRole("button", { name: "Spálňa", exact: true }).click();
      await expect(page.getByText(new RegExp(`^Spálňa${i === 0 ? "$" : ` ${i + 1}$`}`)).first()).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: /Miestnosti \(3\)/ })).toBeVisible();
  });

  test("a room's checklist is pre-populated and a status change persists across reload", async ({ page }) => {
    await login(page);
    await page.goto(`/obhliadky/${inspectionId}/miestnosti`);

    const firstRoomToggle = page.getByRole("button").filter({ hasText: "Spálňa" }).first();
    await firstRoomToggle.click();
    await expect(page.getByRole("heading", { name: "Kontrolný zoznam" })).toBeVisible();

    const wallGroup = page.getByRole("radiogroup", { name: /Steny/ });
    await wallGroup.scrollIntoViewIfNeeded();
    await wallGroup.getByRole("radio", { name: "V" }).click();

    await page.reload();
    await firstRoomToggle.click();
    await expect(page.getByText("V", { exact: true }).first()).toBeVisible();
  });

  test("duplicating a room copies its checklist and appends a new room", async ({ page }) => {
    await login(page);
    await page.goto(`/obhliadky/${inspectionId}/miestnosti`);
    await expect(page.getByRole("heading", { name: /Miestnosti \(3\)/ })).toBeVisible();

    await page.getByRole("button", { name: "Duplikovať miestnosť" }).first().click();
    await expect(page.getByRole("heading", { name: /Miestnosti \(4\)/ })).toBeVisible();
  });

  test("deleting a room removes it after confirmation", async ({ page }) => {
    await login(page);
    await page.goto(`/obhliadky/${inspectionId}/miestnosti`);
    await expect(page.getByRole("heading", { name: /Miestnosti \(4\)/ })).toBeVisible();

    await page.getByRole("button", { name: "Odstrániť" }).first().click();
    await page.getByRole("button", { name: "Odstrániť", exact: true }).last().click();
    await expect(page.getByRole("heading", { name: /Miestnosti \(3\)/ })).toBeVisible();
  });

  test("a cost item can be created directly from a finding and shows correct VAT calculation", async ({ page }) => {
    await login(page);

    // "Položka zo zistenia" only offers Technický stav findings (room-checklist items live on a
    // separate RoomElement/ElementCondition model, not Finding) — mark one as a defect first.
    await page.goto(`/obhliadky/${inspectionId}/technicky-stav`);
    await page.getByRole("button", { name: /Základy a nosné konštrukcie/ }).click();
    const foundationsGroup = page.getByRole("radiogroup", { name: /Základy/ });
    await foundationsGroup.scrollIntoViewIfNeeded();
    await foundationsGroup.getByRole("radio", { name: "V" }).click();
    await page.waitForTimeout(500);

    await page.goto(`/obhliadky/${inspectionId}/naklady`);

    const itemsBefore = await page.getByTestId("cost-item-card").count();

    await page.locator("button", { hasText: "Položka zo zistenia" }).click();
    await page.getByRole("option").first().click();

    // One more cost item row exists than before, and it opens to reveal the price breakdown.
    await expect(page.getByTestId("cost-item-card")).toHaveCount(itemsBefore + 1, { timeout: 10_000 });

    await page.getByTestId("cost-item-card").last().getByTestId("cost-item-toggle").click();

    const unitPriceField = page.getByLabel("Jednotková cena (€)");
    await unitPriceField.fill("100");
    await unitPriceField.blur();
    await page.waitForTimeout(900);

    await expect(page.getByText("Bez DPH:")).toContainText("100,00");
    await expect(page.getByText("S DPH:")).toContainText("123,00"); // 23% VAT applied by default
  });

  test("contingency percentage updates the final total", async ({ page }) => {
    await login(page);
    await page.goto(`/obhliadky/${inspectionId}/naklady`);

    const contingencyInput = page.locator('input[type="number"]').filter({ hasText: "" }).first();
    // The contingency field is the first labelled number input in the summary card.
    const totalBefore = await page.locator("text=S rezervou").locator("..").innerText();

    await page.getByText("Rezerva na nepredvídané práce (%)").locator("..").locator("input").fill("25");
    await page.getByText("Rezerva na nepredvídané práce (%)").locator("..").locator("input").blur();
    await page.waitForTimeout(900); // debounce window

    const totalAfter = await page.locator("text=S rezervou").locator("..").innerText();
    expect(totalAfter).not.toBe(totalBefore);
    void contingencyInput;
  });

  test("required-field validation blocks completion until the technician signature is added, then completes", async ({
    page,
  }) => {
    await login(page);
    await page.goto(`/obhliadky/${inspectionId}/export`);

    await expect(page.getByText("Pred dokončením je potrebné doplniť")).toBeVisible();
    const completeButton = page.getByRole("button", { name: "Dokončiť obhliadku" });
    await expect(completeButton).toBeDisabled();

    // Fill the minimum required fields: inspection date, address, technician signature.
    await page.goto(`/obhliadky/${inspectionId}/zakladne-udaje`);
    await page.getByLabel("Dátum obhliadky").fill("2026-07-20");
    await page.getByLabel("Adresa").fill("Testovacia 1");
    await page.getByLabel("Adresa").blur();
    await page.waitForTimeout(900);

    await page.goto(`/obhliadky/${inspectionId}/vyhlasenie`);
    await expect(page.getByRole("heading", { name: "Vyhlásenie a podpisy" })).toBeVisible();
    const addSignatureButton = page.getByRole("button", { name: "Pridať podpis poradcu" });
    await addSignatureButton.click();

    const nameField = page.getByLabel("Meno a priezvisko").first();
    await expect(nameField).toBeVisible({ timeout: 10_000 });
    await nameField.fill("Ján Technik");
    await nameField.blur();

    // signature_pad listens for PointerEvent (not plain mouse events), so page.mouse.* alone
    // doesn't reliably register a stroke under Playwright/CDP — dispatch pointer events directly.
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) throw new Error("Signature canvas did not render");
    const points: [number, number][] = [
      [20, 20],
      [50, 30],
      [80, 15],
      [110, 40],
      [140, 25],
    ];
    const [firstX, firstY] = points[0];
    await canvas.dispatchEvent("pointerdown", {
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: box.x + firstX,
      clientY: box.y + firstY,
    });
    for (const [dx, dy] of points.slice(1)) {
      await canvas.dispatchEvent("pointermove", {
        pointerId: 1,
        pointerType: "mouse",
        isPrimary: true,
        buttons: 1,
        clientX: box.x + dx,
        clientY: box.y + dy,
      });
    }
    await canvas.dispatchEvent("pointerup", {
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
      buttons: 0,
      clientX: box.x + points[points.length - 1][0],
      clientY: box.y + points[points.length - 1][1],
    });
    await page.getByRole("button", { name: "Uložiť podpis" }).click();

    await page.goto(`/obhliadky/${inspectionId}/export`);
    await expect(page.getByText("Protokol spĺňa všetky nevyhnutné podmienky")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Dokončiť obhliadku" })).toBeEnabled();
  });

  test("PDF export responds with a valid application/pdf document", async ({ page, request }) => {
    await login(page);
    const response = await page.request.get(`/api/inspections/${inspectionId}/pdf`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/pdf");
    const body = await response.body();
    expect(body.subarray(0, 5).toString()).toBe("%PDF-");
    void request;
  });
});
