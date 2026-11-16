import { expect, test, type Page } from "@playwright/test";

/**
 * Official Tello palette extracted from the logo. These values are brand
 * constants: the tests below fail if a theme or component drifts from them.
 */
const BRAND = {
  black: "#000000",
  primary: "#cc1e5d",
  hover: "#b41f54",
  active: "#a72353",
  secondary: "#bb3665",
} as const;

const RGB = {
  primary: "rgb(204, 30, 93)",
  hover: "rgb(180, 31, 84)",
  active: "rgb(167, 35, 83)",
  white: "rgb(255, 255, 255)",
} as const;

/** Browsers may serialize #000000 as #000; normalize back to six digits. */
function hex(value: string): string {
  const match = /^#([0-9a-f]{3})$/i.exec(value);
  if (!match) return value.toLowerCase();
  return `#${match[1]
    .split("")
    .map((digit) => digit + digit)
    .join("")}`;
}

interface BrandSnapshot {
  tokens: Record<string, string>;
  bodyBackground: string;
  bodyForeground: string;
  primaryText: string;
  buttonBackground: string | null;
  buttonForeground: string | null;
  overflow: number;
}

async function snapshot(page: Page): Promise<BrandSnapshot> {
  return page.evaluate(() => {
    const styles = getComputedStyle(document.documentElement);
    const token = (name: string) => styles.getPropertyValue(name).trim();
    const button = document.querySelector<HTMLElement>(
      '[data-slot="button"][data-variant="default"]',
    );

    return {
      tokens: {
        primary: token("--brand-primary"),
        hover: token("--brand-hover"),
        active: token("--brand-active"),
        secondary: token("--brand-secondary"),
        black: token("--brand-black"),
      },
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      bodyForeground: getComputedStyle(document.body).color,
      primaryText: token("--primary-text"),
      buttonBackground: button ? getComputedStyle(button).backgroundColor : null,
      buttonForeground: button ? getComputedStyle(button).color : null,
      overflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}

async function setTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  await page.evaluate((value) => localStorage.setItem("theme", value), theme);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
}

function expectPalette(tokens: Record<string, string>): void {
  expect(tokens.primary).toBe(BRAND.primary);
  expect(tokens.hover).toBe(BRAND.hover);
  expect(tokens.active).toBe(BRAND.active);
  expect(tokens.secondary).toBe(BRAND.secondary);
  expect(hex(tokens.black)).toBe(BRAND.black);
}

async function settle(page: Page): Promise<void> {
  await page
    .locator('[data-testid="splash-screen"]')
    .waitFor({ state: "detached", timeout: 10_000 })
    .catch(() => {});
}

test.describe("brand tokens", () => {
  for (const locale of ["en", "ar"] as const) {
    test(`exposes the exact Tello palette in ${locale} light and dark`, async ({ page }) => {
      await page.goto(`/${locale}`);
      await settle(page);

      await setTheme(page, "light");
      await settle(page);

      const light = await snapshot(page);
      expectPalette(light.tokens);
      expect(light.bodyBackground).not.toBe(RGB.active);
      expect(light.primaryText).toBe(BRAND.primary);
      expect(light.buttonBackground).toBe(RGB.primary);
      expect(light.buttonForeground).toBe(RGB.white);
      expect(light.overflow).toBe(0);

      await setTheme(page, "dark");
      await settle(page);

      const dark = await snapshot(page);
      expectPalette(dark.tokens);
      expect(dark.bodyBackground).toBe("rgb(20, 18, 19)");
      expect(dark.buttonBackground).toBe(RGB.primary);
      expect(dark.buttonForeground).toBe(RGB.white);
      expect(dark.overflow).toBe(0);
    });
  }

  test("defaults to light mode for new visitors", async ({ page }) => {
    await page.goto("/en");
    await settle(page);

    await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(250, 248, 246)");
  });

  test("primary buttons use brand hover and pressed colors", async ({ page }) => {
    await page.goto("/en");
    await settle(page);

    const button = page.locator('[data-slot="button"][data-variant="default"]').first();
    await expect(button).toBeVisible();

    const background = () =>
      button.evaluate((node) => getComputedStyle(node).backgroundColor);

    expect(await background()).toBe(RGB.primary);

    await button.hover();
    await expect.poll(background).toBe(RGB.hover);

    const box = await button.boundingBox();
    if (!box) throw new Error("Primary button has no layout box.");

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect.poll(background).toBe(RGB.active);
    // Release away from the button so the assertion does not trigger navigation.
    await page.mouse.move(0, 0);
    await page.mouse.up();
  });

  test("admin sign-in uses the brand palette in both themes", async ({ page }) => {
    await page.goto("/en/admin/login");

    const light = await snapshot(page);
    expectPalette(light.tokens);
    expect(light.buttonBackground).toBe(RGB.primary);
    expect(light.buttonForeground).toBe(RGB.white);

    await setTheme(page, "dark");
    await page.goto("/ar/admin/login");

    const dark = await snapshot(page);
    expectPalette(dark.tokens);
    expect(dark.bodyBackground).toBe("rgb(20, 18, 19)");
    expect(dark.buttonBackground).toBe(RGB.primary);
  });

  test("logo in the public header opens the localized admin sign-in page", async ({ page }) => {
    await page.goto("/ar");
    await settle(page);

    await page.locator("header a[href='/ar/admin/login']").first().click();
    await expect(page).toHaveURL(/\/ar\/admin\/login$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});
