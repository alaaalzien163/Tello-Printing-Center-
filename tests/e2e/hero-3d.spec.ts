import { expect, test } from "@playwright/test";

import en from "../../messages/en.json";

test.describe("hero 3D scene", () => {
  test("mounts the interactive scene on a capable desktop", async ({ page }) => {
    await page.goto("/en");

    const capable = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      const webgl = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const cores = navigator.hardwareConcurrency;
      const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

      return (
        webgl &&
        !reduced &&
        !mobile &&
        !(typeof cores === "number" && cores < 4) &&
        !(typeof memory === "number" && memory < 4)
      );
    });

    test.skip(!capable, "This environment cannot run the WebGL scene.");

    const container = page.getByTestId("hero-3d-container");
    await container.hover();
    await expect(container).toHaveAttribute("data-scene-mode", "3d", { timeout: 30_000 });
    await expect(page.locator("canvas")).toHaveCount(1);
    await expect(page.getByTestId("hero-scene-fallback")).toBeVisible();
  });

  test("falls back to the poster when WebGL is unavailable", async ({ page }) => {
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;

      HTMLCanvasElement.prototype.getContext = function (
        this: HTMLCanvasElement,
        contextId: string,
        ...args: unknown[]
      ) {
        if (contextId === "webgl" || contextId === "webgl2" || contextId === "experimental-webgl") {
          return null;
        }

        return (originalGetContext as (...params: unknown[]) => unknown).apply(this, [
          contextId,
          ...args,
        ]);
      } as typeof originalGetContext;
    });

    await page.goto("/en");

    const container = page.getByTestId("hero-3d-container");
    await container.hover();
    await expect(container).toHaveAttribute("data-scene-mode", "poster");
    await expect(page.getByTestId("hero-scene-fallback")).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("keeps the static poster and skips the canvas", async ({ page }) => {
      await page.goto("/en");

      const container = page.getByTestId("hero-3d-container");
      await expect(container).toHaveAttribute("data-scene-mode", "poster");
      await expect(page.getByTestId("hero-scene-fallback")).toBeVisible();
      await expect(page.locator("canvas")).toHaveCount(0);
    });
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("uses the poster instead of starting a canvas", async ({ page }) => {
      await page.goto("/en");

      const container = page.getByTestId("hero-3d-container");
      await expect(container).toHaveAttribute("data-scene-mode", "poster");
      await expect(page.getByTestId("hero-scene-fallback")).toBeVisible();
      await expect(page.locator("canvas")).toHaveCount(0);
    });
  });

  test("hydrates the homepage without hydration errors", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(en.hero.title);
    await expect(page.getByTestId("hero-3d-container")).toBeVisible();

    const hydrationErrors = errors.filter((message) =>
      /hydrat|did not match|server rendered/i.test(message),
    );

    expect(hydrationErrors).toEqual([]);
  });

  test("keeps the hero card laid out in Arabic RTL", async ({ page }) => {
    await page.goto("/ar");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByTestId("hero-3d-container")).toBeVisible();

    const box = await page.getByTestId("hero-3d-container").boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(0);
    expect(box?.height ?? 0).toBeGreaterThan(0);
  });
});
