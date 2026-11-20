import { expect, test } from "@playwright/test";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import { getFirstCategory, getFirstPublishedProduct } from "./catalog-helpers";

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

  test("defaults to Arabic for unprefixed URLs", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(ar.hero.title);

    await page.goto("/products");
    await expect(page).toHaveURL(/\/ar\/products$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(ar.products.title);

    await page.goto("/en");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.hero.title);
  });

  test("navigates to the localized homepage from the header logo", async ({ page }) => {
    await page.goto("/en/products");

    const logo = page.locator("header").getByRole("link", { name: en.common.logoAlt });
    const image = logo.getByRole("img");
    await expect(image).toHaveAttribute("alt", en.common.logoAlt);
    await expect(image).toHaveAttribute("src", /logo-tello\.png/);
    await expect(image).toHaveJSProperty("complete", true);
    expect(
      await image.evaluate((node) => (node as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(0);

    await logo.click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    await page.goto("/ar/products");
    const arabicLogo = page.locator("header").getByRole("link", { name: ar.common.logoAlt });
    await expect(arabicLogo.getByRole("img")).toHaveAttribute("alt", ar.common.logoAlt);

    await arabicLogo.click();
    await expect(page).toHaveURL(/\/ar$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });

  test("opens the localized admin sign-in page from the header login link", async ({ page }) => {
    await page.goto("/en/products");
    await page
      .locator("header")
      .getByRole("link", { name: en.nav.login, exact: true })
      .click();
    await expect(page).toHaveURL(/\/en\/admin\/login$/);
    await expect(
      page.getByRole("heading", { level: 1, name: en.admin.login.title }),
    ).toBeVisible();

    await page.goto("/ar/products");
    await page
      .locator("header")
      .getByRole("link", { name: ar.nav.login, exact: true })
      .click();
    await expect(page).toHaveURL(/\/ar\/admin\/login$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(
      page.getByRole("heading", { level: 1, name: ar.admin.login.title }),
    ).toBeVisible();
  });

  test("does not render the former industry trust bar", async ({ page }) => {
    await page.goto("/en");

    await expect(page.getByText("Equipment for professional environments")).toHaveCount(0);
    for (const label of ["Manufacturing", "Architecture", "Healthcare", "Education", "Automotive"]) {
      await expect(page.getByText(label, { exact: true })).toHaveCount(0);
    }
  });

  test("shows categories and their products", async ({ page }) => {
    await page.goto("/en/products");

    const categoryLinks = page.locator('#catalog a[href*="/products/category/"]');
    if ((await categoryLinks.count()) === 0) {
      await expect(page.getByText(en.categories.emptyTitle)).toBeVisible();
      return;
    }

    await expect(categoryLinks.first()).toBeVisible();
    await expect(page.getByRole("searchbox")).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(
      page.locator("#catalog").getByText(/^\d+ categor(y|ies)$/),
    ).toBeVisible();

    const productLinks = page.locator('#catalog h3 a[href*="/products/"]');
    if ((await productLinks.count()) > 0) {
      await expect(productLinks.first()).toBeVisible();
      expect(await productLinks.first().getAttribute("href")).toMatch(
        /^\/en\/products\/[^/]+$/,
      );
    } else {
      await expect(
        page.getByText(en.products.categoryEmptyTitle).first(),
      ).toBeVisible();
    }
  });

  test("switches language while preserving category path and hash", async ({ page }) => {
    const category = await getFirstCategory(page);
    if (!category) {
      test.skip(true, "No published categories in Supabase.");
      return;
    }

    await page.goto(`${category.href}#catalog`);

    await page
      .getByRole("button", {
        name: en.language.switchTo.replace("{language}", "العربية"),
      })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "العربية" }).click();

    await expect(page).toHaveURL(
      new RegExp(`/ar/products/category/${category.slug}#catalog$`),
    );
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
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
    const product = await getFirstPublishedProduct(page);
    if (!product) {
      test.skip(true, "No published products in Supabase.");
      return;
    }

    await page.goto(product.href);

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

  test("returns a real 404 for the removed services routes", async ({ page }) => {
    // The whole /services segment is gone, so both the former overview pages and
    // any former detail URL fall through to the localized not-found route.
    const removedPaths = [
      "/en/services",
      "/ar/services",
      "/en/services/3d-printing",
      "/ar/services/3d-printing",
      "/en/services/uv-printing",
      "/ar/services/document-printing",
    ];

    for (const path of removedPaths) {
      const response = await page.goto(path);
      const messages = path.startsWith("/ar") ? ar : en;

      expect(response?.status()).toBe(404);
      await expect(
        page.getByRole("heading", { name: messages.notFound.title }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: messages.notFound.backHome }),
      ).toBeVisible();
    }
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

  test("opens the localized login page from the menu", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("button", { name: en.nav.openMenu }).click();
    const englishDialog = page.getByRole("dialog", { name: en.nav.menuTitle });
    await englishDialog.getByRole("link", { name: en.nav.login, exact: true }).click();
    await expect(page).toHaveURL(/\/en\/admin\/login$/);

    await page.goto("/ar");
    await page.getByRole("button", { name: ar.nav.openMenu }).click();
    const arabicDialog = page.getByRole("dialog", { name: ar.nav.menuTitle });
    await expect(arabicDialog).toBeVisible();

    const menuOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(menuOverflow).toBeLessThanOrEqual(1);

    await arabicDialog.getByRole("link", { name: ar.nav.login, exact: true }).click();
    await expect(page).toHaveURL(/\/ar\/admin\/login$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});
