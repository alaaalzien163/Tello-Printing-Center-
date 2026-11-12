import { expect, test } from "@playwright/test";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

test.describe("product detail breadcrumbs", () => {
  test("shows Home > Category > Product in English", async ({ page }) => {
    await page.goto("/en/products/forge-x1");

    const breadcrumb = page.getByRole("navigation", { name: en.common.breadcrumb });
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.getByRole("listitem")).toHaveCount(3);

    await expect(breadcrumb.getByRole("link", { name: en.nav.home })).toHaveAttribute(
      "href",
      "/en",
    );
    await expect(breadcrumb.getByRole("link", { name: "3D Printers" })).toHaveAttribute(
      "href",
      "/en/products#catalog",
    );
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText("Tello Forge X1");
    await expect(
      breadcrumb.getByRole("link", { name: "Tello Forge X1" }),
    ).toHaveCount(0);

    const labels = await breadcrumb.getByRole("listitem").allTextContents();
    expect(labels.map((label) => label.trim())).toEqual(["Home", "3D Printers", "Tello Forge X1"]);
  });

  test("shows the Arabic category and product in RTL with a mirrored separator", async ({ page }) => {
    await page.goto("/ar/products/forge-x1");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const breadcrumb = page.getByRole("navigation", { name: ar.common.breadcrumb });
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.getByRole("link", { name: ar.nav.home })).toHaveAttribute(
      "href",
      "/ar",
    );
    await expect(
      breadcrumb.getByRole("link", { name: "طابعات ثلاثية الأبعاد" }),
    ).toHaveAttribute("href", "/ar/products#catalog");
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText("تيلو فورج X1");

    const labels = await breadcrumb.getByRole("listitem").allTextContents();
    expect(labels.map((label) => label.trim())).toEqual([
      "الرئيسية",
      "طابعات ثلاثية الأبعاد",
      "تيلو فورج X1",
    ]);

    const rotation = await breadcrumb
      .locator('[aria-hidden="true"]')
      .first()
      .evaluate((element) => {
        const style = window.getComputedStyle(element);
        return { rotate: style.rotate, transform: style.transform };
      });

    expect(rotation.rotate !== "none" || rotation.transform !== "none").toBe(true);
  });

  test("navigates through the category and homepage links", async ({ page }) => {
    await page.goto("/en/products/forge-x1");

    await page
      .getByRole("navigation", { name: en.common.breadcrumb })
      .getByRole("link", { name: "3D Printers" })
      .click();

    await expect(page).toHaveURL(/\/en\/products#catalog$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.products.title);

    await page.goto("/en/products/forge-x1");
    await page
      .getByRole("navigation", { name: en.common.breadcrumb })
      .getByRole("link", { name: en.nav.home })
      .click();

    await expect(page).toHaveURL(/\/en$/);
  });

  test("stays visible in dark mode", async ({ page }) => {
    await page.goto("/en/products/forge-x1");

    await page.getByRole("button", { name: en.theme.toggle }).first().click();
    await page.getByRole("menuitemradio", { name: en.theme.dark }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    const breadcrumb = page.getByRole("navigation", { name: en.common.breadcrumb });
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText("Tello Forge X1");
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("does not overflow with a long product name", async ({ page }) => {
      await page.goto("/en/products/pla-plus-filament");

      const breadcrumb = page.getByRole("navigation", { name: en.common.breadcrumb });
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(
        "Premium PLA+ Filament 1.75 mm — 1 kg",
      );

      const overflow = await breadcrumb.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
});
