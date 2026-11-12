import { expect, test } from "@playwright/test";

import en from "../../messages/en.json";

import { goToAdminPage, signIn } from "./helpers";

test.describe("admin dashboard", () => {
  test("guards the dashboard and signs in with the development demo", async ({ page }) => {
    await signIn(page);
    await expect(page.getByText(en.admin.common.demoBadge).first()).toBeVisible();
  });

  test("creates, validates, edits and deletes a product", async ({ page }) => {
    await signIn(page);
    await goToAdminPage(page, "products");
    await expect(page.getByRole("heading", { name: en.admin.products.title }).first()).toBeVisible();

    await page.getByRole("button", { name: en.admin.products.addProduct }).click();
    const createDialog = page.getByRole("dialog", { name: en.admin.products.createTitle });
    await expect(createDialog).toBeVisible();

    await createDialog.getByRole("button", { name: en.common.create }).click();
    await expect(createDialog.getByText(en.validation.productNameRequired).first()).toBeVisible();
    await expect(createDialog.getByText(en.validation.skuRequired)).toBeVisible();

    const fields = en.admin.products.fields;
    await createDialog.getByLabel(fields.nameEn).fill("E2E Test Printer");
    await createDialog.getByLabel(fields.nameAr).fill("طابعة اختبار E2E");
    await createDialog.getByLabel(fields.sku).fill("TEL-E2E-001");
    await createDialog.getByLabel(fields.slug).fill("e2e-test-printer");

    await createDialog.locator("#product-category").click();
    await page.getByRole("option", { name: "3D Printers" }).click();

    await createDialog.getByLabel(fields.price).fill("1250");
    await createDialog
      .getByLabel(fields.descriptionEn)
      .fill("A production printer created during the end-to-end test.");
    await createDialog
      .getByLabel(fields.descriptionAr)
      .fill("طابعة إنتاج تم إنشاؤها أثناء اختبار شامل.");

    await createDialog.getByLabel(fields.imageUrl).fill("/images/product-printer.svg");
    await createDialog.getByLabel(fields.imageAltEn).fill("E2E test printer");
    await createDialog.getByLabel(fields.imageAltAr).fill("طابعة اختبار E2E");

    await createDialog.getByRole("button", { name: en.common.create }).click();
    await expect(page.getByText(en.admin.products.createSuccess)).toBeVisible();

    const createdRow = page.getByRole("row").filter({ hasText: "E2E Test Printer" });
    await expect(createdRow).toBeVisible();
    await expect(createdRow.getByText("TEL-E2E-001")).toBeVisible();

    await createdRow.getByRole("button", { name: en.admin.products.table.actions }).click();
    await page.getByRole("menuitem", { name: en.common.edit }).click();

    const editDialog = page.getByRole("dialog", { name: en.admin.products.editTitle });
    await editDialog.getByLabel(fields.nameEn).fill("E2E Test Printer Updated");
    await editDialog.getByRole("button", { name: en.common.save }).click();
    await expect(page.getByText(en.admin.products.updateSuccess)).toBeVisible();

    const updatedRow = page.getByRole("row").filter({ hasText: "E2E Test Printer Updated" });
    await expect(updatedRow).toBeVisible();

    await updatedRow.getByRole("button", { name: en.admin.products.table.actions }).click();
    await page.getByRole("menuitem", { name: en.common.delete }).click();

    const deleteDialog = page.getByRole("alertdialog", {
      name: en.admin.products.deleteTitle,
    });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole("button", { name: en.common.delete }).click();
    await expect(page.getByText(en.admin.products.deleteSuccess)).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "E2E Test Printer Updated" })).toHaveCount(0);
  });

  test("creates and deletes a category and blocks unsafe deletion", async ({ page }) => {
    await signIn(page);
    await goToAdminPage(page, "categories");
    await expect(page.getByRole("heading", { name: en.admin.categories.title }).first()).toBeVisible();

    const populatedRow = page.getByRole("row").filter({ hasText: "3D Printers" });
    await populatedRow.getByRole("button", { name: en.admin.categories.table.actions }).click();
    await page.getByRole("menuitem", { name: en.common.delete }).click();
    await expect(
      page.getByRole("alertdialog", { name: en.admin.categories.deleteBlockedTitle }),
    ).toBeVisible();
    await page.getByRole("button", { name: en.common.close }).click();

    await page.getByRole("button", { name: en.admin.categories.addCategory }).click();
    const createDialog = page.getByRole("dialog", { name: en.admin.categories.createTitle });
    await createDialog.getByRole("button", { name: en.common.create }).click();
    await expect(createDialog.getByText(en.validation.categoryNameRequired).first()).toBeVisible();

    const fields = en.admin.categories.fields;
    await createDialog.getByLabel(fields.nameEn).fill("E2E Category");
    await createDialog.getByLabel(fields.nameAr).fill("فئة E2E");
    await createDialog
      .getByLabel(fields.descriptionEn)
      .fill("A category created during the end-to-end test.");
    await createDialog
      .getByLabel(fields.descriptionAr)
      .fill("فئة تم إنشاؤها أثناء اختبار شامل.");
    await createDialog.getByLabel(fields.slug).fill("e2e-category");
    await createDialog.getByLabel(fields.imageUrl).fill("/images/consumables.svg");
    await createDialog.getByLabel(fields.imageAltEn).fill("E2E category image");
    await createDialog.getByLabel(fields.imageAltAr).fill("صورة فئة E2E");

    await createDialog.getByRole("button", { name: en.common.create }).click();
    await expect(page.getByText(en.admin.categories.createSuccess)).toBeVisible();

    const createdRow = page.getByRole("row").filter({ hasText: "E2E Category" });
    await expect(createdRow).toBeVisible();
    await createdRow.getByRole("button", { name: en.admin.categories.table.actions }).click();
    await page.getByRole("menuitem", { name: en.common.delete }).click();

    const deleteDialog = page.getByRole("alertdialog", {
      name: en.admin.categories.deleteTitle,
    });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole("button", { name: en.common.delete }).click();
    await expect(page.getByText(en.admin.categories.deleteSuccess)).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "E2E Category" })).toHaveCount(0);
  });

  test("updates the admin profile and persists it in the browser", async ({ page }) => {
    await signIn(page);
    await goToAdminPage(page, "profile");
    await expect(page.getByRole("heading", { name: en.admin.profile.title })).toBeVisible();

    const nameInput = page.getByLabel(en.admin.profile.name);
    await nameInput.fill("E2E Administrator");
    await page.getByRole("button", { name: en.admin.profile.save }).click();
    await expect(page.getByText(en.admin.profile.saved)).toBeVisible();

    await page.reload();
    await expect(page.getByLabel(en.admin.profile.name)).toHaveValue("E2E Administrator");
  });

  test("resets demo data from the sidebar", async ({ page }) => {
    await signIn(page);
    await goToAdminPage(page, "products");

    await page.getByRole("button", { name: en.admin.common.resetDemo }).first().click();
    const resetDialog = page.getByRole("alertdialog", { name: en.admin.common.resetTitle });
    await expect(resetDialog).toBeVisible();
    await resetDialog.getByRole("button", { name: en.admin.common.resetDemo }).click();

    await expect(page.getByText(en.admin.common.resetSuccess)).toBeVisible();
  });

  test("switches the dashboard language while preserving the page", async ({ page }) => {
    await signIn(page);
    await goToAdminPage(page, "products");

    await page
      .getByRole("button", {
        name: en.language.switchTo.replace("{language}", "العربية"),
      })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "العربية" }).click();

    await expect(page).toHaveURL(/\/ar\/admin\/products$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  });
});
