import { expect, test } from "@playwright/test";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import {
  getEmptyCategory,
  getFirstCategory,
  getFirstProductInCategory,
  getFirstProductWithVariants,
  getFirstPublishedProduct,
  getProductWithDistinctVariants,
} from "./catalog-helpers";

function pathPattern(path: string): RegExp {
  return new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
}

/** Extracts the underlying asset URL from a next/image optimized src. */
function assetUrl(src: string | null): string {
  if (!src) return "";
  try {
    const url = new URL(src, "http://localhost");
    return url.searchParams.get("url") ?? src;
  } catch {
    return src;
  }
}

test.describe("category-first catalog", () => {
  test("lists categories with the products in each category", async ({ page }) => {
    await page.goto("/en/products");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.products.title);
    await expect(
      page.getByRole("heading", { level: 2, name: en.products.categoriesTitle }),
    ).toBeVisible();

    const categoryLinks = page.locator('#catalog a[href*="/products/category/"]');
    if ((await categoryLinks.count()) === 0) {
      await expect(page.getByText(en.categories.emptyTitle)).toBeVisible();
      return;
    }

    await expect(categoryLinks.first()).toBeVisible();
    await expect(page.getByRole("searchbox")).toHaveCount(0);
    await expect(page.getByRole("combobox")).toHaveCount(0);

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

  test("shows the Arabic catalog in RTL with localized category and product links", async ({
    page,
  }) => {
    await page.goto("/ar/products");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(ar.products.title);

    const categoryLinks = page.locator('#catalog a[href*="/products/category/"]');
    if ((await categoryLinks.count()) === 0) {
      await expect(page.getByText(ar.categories.emptyTitle)).toBeVisible();
      return;
    }

    await expect(categoryLinks.first()).toBeVisible();

    const productLinks = page.locator('#catalog h3 a[href*="/products/"]');
    if ((await productLinks.count()) > 0) {
      await expect(productLinks.first()).toHaveAttribute(
        "href",
        /^\/ar\/products\/[^/]+$/,
      );
    }
  });

  test("shows a jump link for every category section", async ({ page }) => {
    await page.goto("/en/products");

    const categoryLinks = page.locator('#catalog a[href*="/products/category/"]');
    if ((await categoryLinks.count()) === 0) {
      test.skip(true, "No published categories in Supabase.");
      return;
    }

    const jumpLinks = page.locator('#catalog nav a[href^="#category-"]');
    await expect(jumpLinks).toHaveCount(await categoryLinks.count());

    const firstJump = jumpLinks.first();
    const href = await firstJump.getAttribute("href");
    expect(href).toMatch(/^#category-.+$/);

    const sectionId = (href ?? "").slice(1);
    await expect(page.locator(`#catalog section[id="${sectionId}"]`)).toBeVisible();
  });

  test("keeps product card details and WhatsApp ordering on the catalog page", async ({ page }) => {
    const product = await getFirstPublishedProduct(page);
    if (!product) {
      test.skip(true, "No published products in Supabase.");
      return;
    }

    await page.goto("/en/products");
    await expect(page.locator(`a[href="${product.href}"]`).first()).toBeVisible();

    const card = page
      .locator(`#catalog h3 a[href="${product.href}"]`)
      .first()
      .locator("xpath=ancestor::*[@data-slot='card'][1]");
    await expect(card).toBeVisible();
    await expect(card).toContainText(en.products.price);
    await expect(card).toContainText(en.products.viewDetails);
    await expect(card.locator('a[href*="/products/"]').first()).toBeVisible();

    const whatsappLinks = page.locator('a[href*="wa.me/"]');
    if ((await whatsappLinks.count()) > 0) {
      await expect(whatsappLinks.first()).toHaveAttribute(
        "href",
        /^https:\/\/wa\.me\/\d{8,15}\?text=/,
      );
    } else {
      await expect(
        page.getByRole("button", { name: en.whatsapp.unavailableShort, exact: true }).first(),
      ).toBeVisible();
    }
  });

  test("opens a category and shows only products from that category", async ({ page }) => {
    const category = await getFirstCategory(page);
    if (!category) {
      test.skip(true, "No published categories in Supabase.");
      return;
    }

    await page.goto("/en/products");
    await page.locator(`#catalog a[href="${category.href}"]`).click();

    await expect(page).toHaveURL(pathPattern(category.href));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(category.name);
    await expect(page.getByText(en.products.categoryEyebrow)).toBeVisible();

    const productLinks = page.locator('h3 a[href*="/products/"]');
    if ((await productLinks.count()) === 0) {
      await expect(page.getByText(en.products.categoryEmptyTitle)).toBeVisible();
      return;
    }

    await expect(productLinks.first()).toBeVisible();
    const productHref = await productLinks.first().getAttribute("href");
    expect(productHref).toMatch(/^\/en\/products\/[^/]+$/);
  });

  test("supports direct category URLs and product detail navigation", async ({ page }) => {
    const category = await getFirstCategory(page);
    if (!category) {
      test.skip(true, "No published categories in Supabase.");
      return;
    }

    await page.goto(category.href);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(category.name);

    const product = await getFirstProductInCategory(page, category);
    if (!product) {
      test.skip(true, "The first published category has no products.");
      return;
    }

    await page.goto(category.href);
    await page.locator(`h3 a[href="${product.href}"]`).first().click();

    await expect(page).toHaveURL(pathPattern(product.href));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(product.name);
  });

  test("keeps browser Back and Forward navigation working", async ({ page }) => {
    const product = await getFirstPublishedProduct(page);
    if (!product) {
      test.skip(true, "No published products in Supabase.");
      return;
    }

    await page.goto(product.category.href);
    await page.locator(`h3 a[href="${product.href}"]`).first().click();
    await expect(page).toHaveURL(pathPattern(product.href));

    await page.goBack();
    await expect(page).toHaveURL(pathPattern(product.category.href));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      product.category.name,
    );

    await page.goForward();
    await expect(page).toHaveURL(pathPattern(product.href));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(product.name);
  });

  test("returns to the category overview without leaving the section", async ({ page }) => {
    const category = await getFirstCategory(page);
    if (!category) {
      test.skip(true, "No published categories in Supabase.");
      return;
    }

    await page.goto(category.href);
    await page.getByRole("link", { name: en.products.backToCategories }).click();

    await expect(page).toHaveURL(/\/en\/products$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.products.title);
  });

  test("shows a linked category breadcrumb and an unlinked current page", async ({ page }) => {
    const product = await getFirstPublishedProduct(page);
    if (!product) {
      test.skip(true, "No published products in Supabase.");
      return;
    }

    await page.goto(product.href);

    const breadcrumb = page.getByRole("navigation", { name: en.common.breadcrumb });
    await expect(breadcrumb.getByRole("listitem")).toHaveCount(3);

    const labels = await breadcrumb.getByRole("listitem").allTextContents();
    expect(labels.map((label) => label.trim())).toEqual([
      en.nav.home,
      product.category.name,
      product.name,
    ]);

    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(product.name);
    await expect(breadcrumb.getByRole("link", { name: product.category.name })).toHaveAttribute(
      "href",
      product.category.href,
    );
    await expect(breadcrumb.getByRole("link", { name: product.name })).toHaveCount(0);
  });

  test("renders the Arabic category, RTL trail and mirrored separator", async ({ page }) => {
    const category = await getFirstCategory(page);
    if (!category) {
      test.skip(true, "No published categories in Supabase.");
      return;
    }

    const product = await getFirstProductInCategory(page, category);

    await page.goto(`/ar/products/category/${category.slug}`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    if (product) {
      await expect(
        page.locator(`a[href="/ar/products/${product.slug}"]`).first(),
      ).toBeVisible();
    }

    const breadcrumb = page.getByRole("navigation", { name: ar.common.breadcrumb });
    const labels = await breadcrumb.getByRole("listitem").allTextContents();
    expect(labels[0]?.trim()).toBe(ar.nav.home);
    expect(labels).toHaveLength(3);

    const rotation = await breadcrumb
      .locator('[aria-hidden="true"]')
      .first()
      .evaluate((element) => {
        const style = window.getComputedStyle(element);
        return { rotate: style.rotate, transform: style.transform };
      });

    expect(rotation.rotate !== "none" || rotation.transform !== "none").toBe(true);
  });

  test("stays usable in dark mode", async ({ page }) => {
    const category = await getFirstCategory(page);
    if (!category) {
      test.skip(true, "No published categories in Supabase.");
      return;
    }

    await page.goto(category.href);
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload();

    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(category.name);
  });

  test("shows an empty state for a category without active products", async ({ page }) => {
    const category = await getEmptyCategory(page);
    if (!category) {
      test.skip(true, "No published category is currently empty.");
      return;
    }

    await page.goto(category.href);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(category.name);
    await expect(page.getByText(en.products.categoryEmptyTitle)).toBeVisible();
    await expect(page.getByText(en.products.categoryEmptyDescription)).toBeVisible();
    await expect(
      page.getByRole("link", { name: en.products.backToCategories }).first(),
    ).toBeVisible();
  });

  test("returns a localized not-found page for an invalid category slug", async ({ page }) => {
    await page.goto("/en/products/category/not-a-real-category");

    await expect(page.getByRole("heading", { name: en.notFound.title })).toBeVisible();
    await expect(page.getByText(en.notFound.description)).toBeVisible();
  });

  test("keeps product details and WhatsApp ordering on category cards", async ({ page }) => {
    const product = await getFirstPublishedProduct(page);
    if (!product) {
      test.skip(true, "No published products in Supabase.");
      return;
    }

    await page.goto(product.category.href);

    await expect(page.locator(`a[href="${product.href}"]`).first()).toBeVisible();

    const whatsappLinks = page.locator('a[href*="wa.me/"]');
    if ((await whatsappLinks.count()) > 0) {
      await expect(whatsappLinks.first()).toHaveAttribute(
        "href",
        /^https:\/\/wa\.me\/\d{8,15}\?text=/,
      );
    } else {
      await expect(
        page.getByRole("button", { name: en.whatsapp.unavailableShort, exact: true }).first(),
      ).toBeVisible();
    }
  });

  test("renders categories without category images or placeholders", async ({ page }) => {
    await page.goto("/en/products");

    const categoryLinks = page.locator('#catalog a[href*="/products/category/"]');
    if ((await categoryLinks.count()) === 0) {
      test.skip(true, "No published categories in Supabase.");
      return;
    }

    const categoryGrid = page.getByTestId("category-grid");
    await expect(categoryGrid).toBeVisible();
    await expect(categoryGrid.locator("img")).toHaveCount(0);
    await expect(categoryGrid.locator("picture")).toHaveCount(0);
  });

  test("renders the category hero without an image", async ({ page }) => {
    const category = await getFirstCategory(page);
    if (!category) {
      test.skip(true, "No published categories in Supabase.");
      return;
    }

    await page.goto(category.href);

    const hero = page.getByTestId("category-hero");
    await expect(hero).toBeVisible();
    await expect(hero.getByRole("heading", { level: 1 })).toHaveText(category.name);
    await expect(hero.locator("img")).toHaveCount(0);
  });

  test("links every product on a category page back to that category", async ({ page }) => {
    const category = await getFirstCategory(page);
    if (!category) {
      test.skip(true, "No published categories in Supabase.");
      return;
    }

    const product = await getFirstProductInCategory(page, category);
    if (!product) {
      test.skip(true, "The first published category has no products.");
      return;
    }

    await page.goto(product.href);

    const breadcrumb = page.getByRole("navigation", { name: en.common.breadcrumb });
    await expect(
      breadcrumb.getByRole("link", { name: category.name }),
    ).toHaveAttribute("href", category.href);
  });

  test("switches variant image, price, label and WhatsApp message", async ({ page }) => {
    // Variants may share a price or image in the real catalog, so use a product
    // whose first two variants genuinely differ in every field under test.
    const product = await getProductWithDistinctVariants(page);
    if (!product) {
      test.skip(
        true,
        "No published product has two variants with distinct labels, prices and images.",
      );
      return;
    }

    await page.goto(product.href);

    const options = page.getByTestId("variant-option");
    await expect(options.first()).toBeVisible();
    const optionCount = await options.count();
    if (optionCount < 2) {
      test.skip(true, "The first published product has fewer than two variants.");
      return;
    }

    const mainImage = page.locator('[data-testid="product-main-image"] img').first();
    await expect(mainImage).toBeVisible();

    const initialSrc = assetUrl(await mainImage.getAttribute("src"));
    const initialPrice = (await page.getByTestId("product-price").innerText()).trim();
    const initialLabel = (await page.getByTestId("selected-variant").innerText()).trim();

    const second = options.nth(1);
    const secondLabel = (await second.getByTestId("variant-label").innerText()).trim();
    const secondPrice = (await second.getByTestId("variant-price").innerText()).trim();
    const secondThumb = assetUrl(await second.locator("img").first().getAttribute("src"));

    await second.click();

    await expect(page.getByTestId("selected-variant")).toHaveText(secondLabel);
    await expect(page.getByTestId("product-price")).toHaveText(secondPrice);
    await expect(second).toHaveAttribute("aria-pressed", "true");

    await expect
      .poll(async () => assetUrl(await mainImage.getAttribute("src")))
      .toBe(secondThumb);
    expect(assetUrl(await mainImage.getAttribute("src"))).not.toBe(initialSrc);
    expect(secondLabel).not.toBe(initialLabel);
    expect(secondPrice).not.toBe(initialPrice);

    const whatsapp = page.locator('a[href*="wa.me/"]').first();
    if ((await whatsapp.count()) > 0) {
      const href = await whatsapp.getAttribute("href");
      const message = new URL(href ?? "").searchParams.get("text") ?? "";
      expect(message).toContain(secondLabel);
    }
  });

  test("keeps the variant selector usable in Arabic RTL", async ({ page }) => {
    const product = await getFirstProductWithVariants(page);
    if (!product) {
      test.skip(true, "No published product has at least two variants.");
      return;
    }

    await page.goto(`/ar/products/${product.slug}`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const options = page.getByTestId("variant-option");
    await expect(options.first()).toBeVisible();
    if ((await options.count()) < 2) {
      test.skip(true, "The first published product has fewer than two variants.");
      return;
    }

    const mainImage = page.locator('[data-testid="product-main-image"] img').first();
    const before = assetUrl(await mainImage.getAttribute("src"));

    await options.nth(1).click();
    await expect(options.nth(1)).toHaveAttribute("aria-pressed", "true");

    const after = assetUrl(await mainImage.getAttribute("src"));
    expect(after).not.toBe("");
    expect(before).not.toBe("");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("keeps a long category and product name inside the viewport", async ({ page }) => {
      const category = await getFirstCategory(page);
      if (!category) {
        test.skip(true, "No published categories in Supabase.");
        return;
      }

      await page.goto(category.href);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(category.name);

      const product = await getFirstProductInCategory(page, category);
      if (product) {
        await expect(
          page.getByRole("link", { name: product.name }).first(),
        ).toBeVisible();
      }

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test("keeps the Arabic category page inside the viewport", async ({ page }) => {
      const category = await getFirstCategory(page);
      if (!category) {
        test.skip(true, "No published categories in Supabase.");
        return;
      }

      await page.goto(`/ar/products/category/${category.slug}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test("keeps the Arabic product catalog inside the viewport", async ({ page }) => {
      await page.goto("/ar/products");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(ar.products.title);
      await expect(
        page.getByRole("heading", { level: 2, name: ar.products.categoriesTitle }),
      ).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });

    test("keeps the English product catalog inside the viewport", async ({ page }) => {
      await page.goto("/en/products");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.products.title);

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
});
