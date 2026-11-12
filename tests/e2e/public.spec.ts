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

  test("does not render the former industry trust bar", async ({ page }) => {
    await page.goto("/en");

    await expect(page.getByText("Equipment for professional environments")).toHaveCount(0);
    for (const label of ["Manufacturing", "Architecture", "Healthcare", "Education", "Automotive"]) {
      await expect(page.getByText(label, { exact: true })).toHaveCount(0);
    }
  });

  test("shows the catalog without search or filter controls", async ({ page }) => {
    await page.goto("/en/products");

    await expect(page.getByRole("heading", { name: "Tello Forge X1" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tello Forge Pro 600" })).toBeVisible();
    await expect(page.getByRole("searchbox")).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.locator("#catalog").getByText(/^\d+ products?$/)).toBeVisible();
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

  test("links to WhatsApp only with a valid configured number", async ({ page }) => {
    await page.goto("/en/products/forge-x1");

    const whatsappLinks = page.locator('a[href*="wa.me/"]');
    const linkCount = await whatsappLinks.count();

    if (linkCount > 0) {
      for (let index = 0; index < linkCount; index += 1) {
        await expect(whatsappLinks.nth(index)).toHaveAttribute(
          "href",
          /^https:\/\/wa\.me\/\d{8,15}\?text=/,
        );
      }
      return;
    }

    const unavailable = page.getByRole("button", {
      name: en.whatsapp.unavailableShort,
      exact: true,
    });
    await expect(unavailable.first()).toBeVisible();
    await unavailable.first().click();
    await expect(
      page.getByRole("dialog", { name: en.whatsapp.configTitle }),
    ).toBeVisible();
  });

  test("offers WhatsApp contact instead of an email form", async ({ page }) => {
    await page.goto("/en/contact");

    const contact = page.locator("#contact");
    await expect(contact.getByRole("heading", { name: en.contact.whatsappTitle })).toBeVisible();
    await expect(contact.locator("form")).toHaveCount(0);
    await expect(contact.locator('input[type="email"]')).toHaveCount(0);

    const whatsappLinks = contact.locator('a[href*="wa.me/"]');

    if ((await whatsappLinks.count()) > 0) {
      await expect(whatsappLinks.first()).toHaveAttribute(
        "href",
        /^https:\/\/wa\.me\/\d{8,15}\?text=/,
      );
      await expect(contact.getByText(en.contact.whatsappNumberLabel)).toBeVisible();
    } else {
      await expect(contact.getByText(en.contact.whatsappNotConfigured)).toBeVisible();
    }
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
