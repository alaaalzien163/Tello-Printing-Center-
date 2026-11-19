import { expect, test } from "@playwright/test";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";

test.describe("about section", () => {
  test("renders the English company profile", async ({ page }) => {
    await page.goto("/en");

    const about = page.locator("#about");
    await expect(about.getByRole("heading", { level: 2 })).toHaveText(en.about.title);
    await expect(about.getByText(en.about.description)).toBeVisible();

    // The story card was removed from the customized layout, so the profile
    // assertions cover the content that is actually rendered: the heading,
    // description and the three facts.
    await expect(about.getByText(en.about.facts.foundedValue, { exact: true })).toBeVisible();
    await expect(about.getByText(en.about.facts.locationValue, { exact: true })).toBeVisible();
    await expect(about.getByText(en.about.facts.experienceValue, { exact: true })).toBeVisible();
  });

  test("does not render the removed service and why blocks", async ({ page }) => {
    for (const locale of ["en", "ar"] as const) {
      await page.goto(`/${locale}`);
      const about = page.locator("#about");

      await expect(
        about.getByText(
          "Equipment, supplies and printing services in one place.",
        ),
      ).toHaveCount(0);
      await expect(
        about.getByText("Why customers choose Tello Printing Center."),
      ).toHaveCount(0);
      await expect(about.getByText("Serving Damascus since 1985")).toHaveCount(0);
      await expect(about.getByText("Why Tello")).toHaveCount(0);
    }
  });

  test("footer links stay localized, relative and free of the removed Services entry", async ({
    page,
  }) => {
    for (const locale of ["en", "ar"] as const) {
      await page.goto(`/${locale}`);
      const footer = page.locator("footer");

      const hrefs = await footer
        .locator("a")
        .evaluateAll((links) => links.map((link) => link.getAttribute("href") ?? ""));
      const internalHrefs = hrefs.filter(
        (href) => !/^(https?:|mailto:|tel:)/.test(href),
      );

      expect(internalHrefs.every((href) => href.startsWith("/"))).toBe(true);
      expect(internalHrefs.some((href) => href.includes("localhost"))).toBe(false);
      expect(internalHrefs).toContain(`/${locale}`);
      // The footer link columns were removed from the customized layout, so the
      // only remaining footer link is the localized brand link. Keep checking
      // that no removed Services route is advertised.
      expect(internalHrefs.some((href) => href.includes("/services"))).toBe(false);

      const servicesLabel = locale === "en" ? "Services" : "الخدمات";
      await expect(
        footer.getByRole("link", { name: servicesLabel, exact: true }),
      ).toHaveCount(0);
    }
  });

  test("renders the Arabic profile in RTL", async ({ page }) => {
    await page.goto("/ar");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");

    const about = page.locator("#about");
    await expect(about.getByRole("heading", { level: 2 })).toHaveText(ar.about.title);
    await expect(about.getByText(ar.about.description)).toBeVisible();
    await expect(about.getByText(ar.about.facts.foundedValue, { exact: true })).toBeVisible();
    await expect(about.getByText(ar.about.facts.locationValue, { exact: true })).toBeVisible();
    await expect(about.getByText(ar.about.facts.experienceValue, { exact: true })).toBeVisible();
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
