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
