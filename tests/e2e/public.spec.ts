import { expect, test } from "@playwright/test";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

test.describe("public website", () => {
  test("renders the homepage sections", async ({ page }) => {
    await page.goto("/en");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.hero.title);
    await expect(page.getByRole("heading", { name: en.about.title })).toBeVisible();
    await expect(page.getByRole("heading", { name: en.categories.title })).toBeVisible();
    await expect(page.getByRole("heading", { name: en.contact.title })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("link", { name: en.nav.products }).first()).toBeVisible();
  });

  test("opens the admin sign-in page from the header logo", async ({ page }) => {
    await page.goto("/en");

    await page.getByRole("link", { name: en.nav.adminLogin }).click();

    await expect(page).toHaveURL(/\/en\/admin\/login$/);
    await expect(
      page.getByRole("heading", { level: 1, name: en.admin.login.title }),
    ).toBeVisible();
  });

  test("searches the product catalog", async ({ page }) => {
    await page.goto("/en/products");

    await page.getByLabel(en.products.searchLabel).fill("TEL-FDM-001");

    await expect(page.getByText("1 product", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tello Forge X1" })).toBeVisible();
    await expect(page.getByText("Extruder Maintenance Kit", { exact: true })).toHaveCount(0);
  });

  test("filters the catalog by category", async ({ page }) => {
    await page.goto("/en/products");

    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "3D Printers" }).click();

    await expect(page.getByRole("heading", { name: "Tello Forge X1" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tello Forge Pro 600" })).toBeVisible();
    await expect(page.getByText("3 products", { exact: true })).toBeVisible();
  });

  test("switches language while preserving path, query and hash", async ({ page }) => {
    await page.goto("/en/products?category=cat-3d-printers#catalog");

    await page
      .getByRole("button", {
        name: en.language.switchTo.replace("{language}", "العربية"),
      })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "العربية" }).click();

    await expect(page).toHaveURL(/\/ar\/products\?category=cat-3d-printers#catalog$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(ar.products.title);
  });

  test("applies light and dark theme preferences", async ({ page }) => {
    await page.goto("/en");

    await page.getByRole("button", { name: en.theme.toggle }).first().click();
    await page.getByRole("menuitemradio", { name: en.theme.dark }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.getByRole("button", { name: en.theme.toggle }).first().click();
    await page.getByRole("menuitemradio", { name: en.theme.light }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("shows WhatsApp configuration guidance instead of a broken link", async ({ page }) => {
    await page.goto("/en/products/forge-x1");

    await expect(
      page.getByRole("button", { name: en.whatsapp.unavailableShort, exact: true }),
    ).toBeVisible();
    await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0);

    await page.getByRole("button", { name: en.whatsapp.unavailableShort, exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: en.whatsapp.configTitle }),
    ).toBeVisible();
  });

  test("validates and completes the contact form locally", async ({ page }) => {
    await page.goto("/en/contact");

    await page.getByRole("button", { name: en.contact.submit }).click();
    await expect(page.getByText(en.validation.nameRequired)).toBeVisible();
    await expect(page.getByText(en.validation.emailRequired)).toBeVisible();

    await page.getByLabel(en.contact.name).fill("E2E Visitor");
    await page.getByLabel(en.contact.email).fill("visitor@example.com");
    await page.getByLabel(en.contact.message).fill("I would like a quote for a production printer.");
    await page.getByRole("button", { name: en.contact.submit }).click();

    await expect(page.getByRole("heading", { name: en.contact.successTitle })).toBeVisible();
  });

  test("renders the localized not-found page", async ({ page }) => {
    await page.goto("/en/this-page-does-not-exist");

    await expect(page.getByRole("heading", { name: en.notFound.title })).toBeVisible();
    await expect(page.getByRole("link", { name: en.notFound.backHome })).toBeVisible();
  });
});

test.describe("mobile navigation", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("opens the menu and navigates to products", async ({ page }) => {
    await page.goto("/en");

    await page.getByRole("button", { name: en.nav.openMenu }).click();
    const dialog = page.getByRole("dialog", { name: en.nav.menuTitle });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("link", { name: en.nav.products }).first().click();
    await expect(page).toHaveURL(/\/en\/products$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.products.title);
  });
});
