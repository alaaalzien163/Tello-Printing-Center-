import { expect, test } from "@playwright/test";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

test.describe("about section", () => {
  test("renders the complete English company profile", async ({ page }) => {
    await page.goto("/en");

    const about = page.locator("#about");
    await expect(about.getByRole("heading", { level: 2 })).toHaveText(en.about.title);
    await expect(
      about.getByRole("heading", { level: 3, name: en.about.story.title }),
    ).toBeVisible();
    await expect(
      about.getByRole("heading", { level: 3, name: en.about.services.title }),
    ).toBeVisible();

    for (const service of Object.values(en.about.services.items)) {
      await expect(
        about.getByRole("heading", { level: 4, name: service.title }),
      ).toBeVisible();
    }

    await expect(
      about.getByRole("heading", { level: 3, name: en.about.materials.title }),
    ).toBeVisible();
    await expect(
      about.getByRole("heading", {
        level: 4,
        name: en.about.materials.consumables.title,
      }),
    ).toBeVisible();
    await expect(about.getByText("PLA", { exact: true })).toBeVisible();
    await expect(
      about.getByRole("heading", { level: 3, name: en.about.why.title }),
    ).toBeVisible();
    await expect(about.getByRole("link", { name: en.about.why.cta })).toBeVisible();
    await expect(about.getByRole("link", { name: en.about.why.secondaryCta })).toBeVisible();
  });

  test("renders the complete Arabic profile in RTL", async ({ page }) => {
    await page.goto("/ar");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const about = page.locator("#about");
    await expect(about.getByRole("heading", { level: 2 })).toHaveText(ar.about.title);
    await expect(
      about.getByRole("heading", { level: 3, name: ar.about.story.title }),
    ).toBeVisible();

    for (const service of Object.values(ar.about.services.items)) {
      await expect(
        about.getByRole("heading", { level: 4, name: service.title }),
      ).toBeVisible();
    }

    await expect(about.getByText("ألياف الكربون", { exact: true })).toBeVisible();
    await expect(
      about.getByRole("heading", {
        level: 4,
        name: ar.about.materials.consumables.title,
      }),
    ).toBeVisible();
    await expect(about.getByRole("link", { name: ar.about.why.cta })).toBeVisible();
  });

  test("loads without console or page errors in both locales", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    for (const path of ["/en", "/ar"]) {
      await page.goto(path);
      await page.locator("#about").scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
    }

    expect(errors).toEqual([]);
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("does not overflow horizontally in Arabic", async ({ page }) => {
      await page.goto("/ar");

      const about = page.locator("#about");
      await about.scrollIntoViewIfNeeded();
      await expect(about.getByRole("heading", { level: 2 })).toBeVisible();

      const overflow = await about.evaluate((element) => element.scrollWidth - element.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  });
});
