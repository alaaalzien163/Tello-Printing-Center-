import { expect, type Page } from "@playwright/test";

import en from "../../messages/en.json";

export interface CatalogEntry {
  name: string;
  href: string;
  slug: string;
}

export interface PublishedProduct extends CatalogEntry {
  category: CatalogEntry;
}

function slugFromHref(href: string): string {
  return href.split("/").filter(Boolean).pop() ?? "";
}

async function readCategoryLinks(page: Page): Promise<CatalogEntry[]> {
  const links = page.locator('#catalog a[href*="/products/category/"]');
  const count = await links.count();
  const entries: CatalogEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    const link = links.nth(index);
    const href = await link.getAttribute("href");
    if (!href) continue;

    entries.push({
      name: (await link.locator("h3").first().innerText()).trim(),
      href,
      slug: slugFromHref(href),
    });
  }

  return entries;
}

/** Publishes categories come from Supabase, so tests discover them at runtime. */
export async function getPublishedCategories(page: Page): Promise<CatalogEntry[]> {
  await page.goto("/en/products");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    en.products.title,
  );

  return readCategoryLinks(page);
}

export async function getFirstCategory(page: Page): Promise<CatalogEntry | null> {
  const categories = await getPublishedCategories(page);
  return categories[0] ?? null;
}

export async function getFirstProductInCategory(
  page: Page,
  category: CatalogEntry,
): Promise<CatalogEntry | null> {
  await page.goto(category.href);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(category.name);

  const link = page.locator('h3 a[href*="/products/"]').first();
  if ((await link.count()) === 0) return null;

  const href = await link.getAttribute("href");
  if (!href) return null;

  return {
    name: (await link.innerText()).trim(),
    href,
    slug: slugFromHref(href),
  };
}

/** Finds the first visible product across the published categories. */
export async function getFirstPublishedProduct(
  page: Page,
): Promise<PublishedProduct | null> {
  const categories = await getPublishedCategories(page);

  for (const category of categories) {
    const product = await getFirstProductInCategory(page, category);
    if (product) return { ...product, category };
  }

  return null;
}

/** Finds the first published product that exposes at least two variants. */
export async function getFirstProductWithVariants(
  page: Page,
): Promise<PublishedProduct | null> {
  const categories = await getPublishedCategories(page);

  for (const category of categories) {
    await page.goto(category.href);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(category.name);

    const links = page.locator('h3 a[href*="/products/"]');
    const count = await links.count();
    const entries: CatalogEntry[] = [];

    // Collect hrefs before navigating away: the locator is bound to the
    // category page and becomes stale once a product detail page is open.
    for (let index = 0; index < count; index += 1) {
      const link = links.nth(index);
      const href = await link.getAttribute("href");
      if (!href) continue;

      entries.push({
        name: (await link.innerText()).trim(),
        href,
        slug: slugFromHref(href),
      });
    }

    for (const entry of entries) {
      await page.goto(entry.href);

      const options = page.getByTestId("variant-option");
      if ((await options.count()) >= 2) {
        return { ...entry, category };
      }
    }
  }

  return null;
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

/**
 * Finds the first published product whose first two variants differ in label,
 * price and image. Catalog variants may legitimately share a price or image,
 * so the switching test must not assume every pair differs.
 */
export async function getProductWithDistinctVariants(
  page: Page,
): Promise<PublishedProduct | null> {
  const categories = await getPublishedCategories(page);

  for (const category of categories) {
    await page.goto(category.href);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(category.name);

    const links = page.locator('h3 a[href*="/products/"]');
    const count = await links.count();
    const entries: CatalogEntry[] = [];

    // Collect hrefs before navigating away: the locator is bound to the
    // category page and becomes stale once a product detail page is open.
    for (let index = 0; index < count; index += 1) {
      const link = links.nth(index);
      const href = await link.getAttribute("href");
      if (!href) continue;

      entries.push({
        name: (await link.innerText()).trim(),
        href,
        slug: slugFromHref(href),
      });
    }

    for (const entry of entries) {
      await page.goto(entry.href);

      const options = page.getByTestId("variant-option");
      if ((await options.count()) < 2) continue;

      const first = options.nth(0);
      const second = options.nth(1);
      const firstImage = first.locator("img").first();
      const secondImage = second.locator("img").first();
      if ((await firstImage.count()) === 0 || (await secondImage.count()) === 0) {
        continue;
      }

      const firstLabel = (await first.getByTestId("variant-label").innerText()).trim();
      const secondLabel = (await second.getByTestId("variant-label").innerText()).trim();
      const firstPrice = (await first.getByTestId("variant-price").innerText()).trim();
      const secondPrice = (await second.getByTestId("variant-price").innerText()).trim();
      const firstSrc = assetUrl(await firstImage.getAttribute("src"));
      const secondSrc = assetUrl(await secondImage.getAttribute("src"));

      if (
        firstLabel !== secondLabel &&
        firstPrice !== secondPrice &&
        firstSrc &&
        secondSrc &&
        firstSrc !== secondSrc
      ) {
        return { ...entry, category };
      }
    }
  }

  return null;
}

export async function getEmptyCategory(page: Page): Promise<CatalogEntry | null> {
  await page.goto("/en/products");

  const links = page.locator('#catalog a[href*="/products/category/"]');
  const count = await links.count();

  for (let index = 0; index < count; index += 1) {
    const link = links.nth(index);
    const badge = await link.getByText("No products", { exact: true }).count();
    if (badge === 0) continue;

    const href = await link.getAttribute("href");
    if (!href) continue;

    return {
      name: (await link.locator("h3").first().innerText()).trim(),
      href,
      slug: slugFromHref(href),
    };
  }

  return null;
}
