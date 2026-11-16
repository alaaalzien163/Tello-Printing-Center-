import { expect, test } from "@playwright/test";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import { getFirstPublishedProduct } from "./catalog-helpers";

function pathPattern(path: string): RegExp {
  return new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
}

test.describe("product detail breadcrumbs", () => {
  test("shows Home > Category > Product in English", async ({ page }) => {
    const product = await getFirstPublishedProduct(page);
    if (!product) {
      test.skip(true, "No published products in Supabase.");
      return;
    }

    await page.goto(product.href);

    const breadcrumb = page.getByRole("navigation", { name: en.common.breadcrumb });
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.getByRole("listitem")).toHaveCount(3);

    await expect(breadcrumb.getByRole("link", { name: en.nav.home })).toHaveAttribute(
      "href",
      "/en",
    );
    await expect(
      breadcrumb.getByRole("link", { name: product.category.name }),
    ).toHaveAttribute("href", product.category.href);
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(product.name);
    await expect(breadcrumb.getByRole("link", { name: product.name })).toHaveCount(0);

    const labels = await breadcrumb.getByRole("listitem").allTextContents();
    expect(labels.map((label) => label.trim())).toEqual([
      en.nav.home,
      product.category.name,
      product.name,
    ]);
  });

  test("shows the Arabic category and product in RTL with a mirrored separator", async ({ page }) => {
    const product = await getFirstPublishedProduct(page);
    if (!product) {
      test.skip(true, "No published products in Supabase.");
      return;
    }

    await page.goto(`/ar/products/${product.slug}`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    const arabicProductName = (await heading.innerText()).trim();

    const breadcrumb = page.getByRole("navigation", { name: ar.common.breadcrumb });
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.getByRole("link", { name: ar.nav.home })).toHaveAttribute(
      "href",
      "/ar",
    );
    await expect(
      breadcrumb.locator(
        `a[href="/ar/products/category/${product.category.slug}"]`,
      ),
    ).toBeVisible();
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(arabicProductName);

    const labels = await breadcrumb.getByRole("listitem").allTextContents();
    expect(labels[0]?.trim()).toBe(ar.nav.home);
    expect(labels).toHaveLength(3);
    expect(labels[2]?.trim()).toBe(arabicProductName);

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
    const product = await getFirstPublishedProduct(page);
    if (!product) {
      test.skip(true, "No published products in Supabase.");
      return;
    }

    await page.goto(product.href);

    const breadcrumb = page.getByRole("navigation", { name: en.common.breadcrumb });
    await breadcrumb
      .getByRole("link", { name: product.category.name })
      .click();

    await expect(page).toHaveURL(pathPattern(product.category.href));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      product.category.name,
    );

    await page.goto(product.href);
    await breadcrumb.getByRole("link", { name: en.nav.home }).click();

    await expect(page).toHaveURL(/\/en$/);
  });

  test("stays visible in dark mode", async ({ page }) => {
    const product = await getFirstPublishedProduct(page);
    if (!product) {
      test.skip(true, "No published products in Supabase.");
      return;
    }

    // Persist the dark preference instead of using the theme menu, which has a
    // pre-existing dev-only hydration race on first paint.
    await page.goto(product.href);
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);

    const breadcrumb = page.getByRole("navigation", { name: en.common.breadcrumb });
    await expect(breadcrumb).toBeVisible();
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(product.name);
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("does not overflow with a long product name", async ({ page }) => {
      const product = await getFirstPublishedProduct(page);
      if (!product) {
        test.skip(true, "No published products in Supabase.");
        return;
      }

      await page.goto(product.href);

      const breadcrumb = page.getByRole("navigation", { name: en.common.breadcrumb });
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(product.name);

      const overflow = await breadcrumb.evaluate(
        (element) => element.scrollWidth - element.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
});
