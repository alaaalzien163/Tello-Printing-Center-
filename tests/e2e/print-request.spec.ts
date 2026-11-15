import { closeSync, ftruncateSync, openSync } from "node:fs";

import { expect, test } from "@playwright/test";

import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import {
  adminCredentials,
  goToAdminPage,
  signIn,
} from "./helpers";

const submissionReady = Boolean(process.env.SUPABASE_SECRET_KEY);
const submissionMissing =
  "Set SUPABASE_SECRET_KEY, apply supabase/migrations/20261114190000_print_requests.sql, supabase/migrations/20261115090000_print_requests_reconcile.sql and supabase/migrations/20261115130000_print_request_rate_limit_ip_hash.sql, and configure the print-request bucket to run submission tests.";

function uniqueSubmissionId(): string {
  return crypto.randomUUID();
}

const basePayload = {
  customerName: "E2E Print Customer",
  phone: "+963 944 000 111",
  details: "Please print this test part in PLA with a 0.2 mm layer height.",
  locale: "en" as const,
  website: "",
  files: [],
};

async function createRequestThroughApi(
  request: import("@playwright/test").APIRequestContext,
  overrides: Record<string, unknown> = {},
) {
  return request.post("/api/public/print-requests", {
    data: {
      ...basePayload,
      submissionId: uniqueSubmissionId(),
      ...overrides,
    },
  });
}

test.describe("public print request page", () => {
  test("renders the English form and validates required fields", async ({ page }) => {
    await page.goto("/en/print-request");

    await expect(
      page.getByRole("heading", { level: 1, name: en.printRequest.page.title }),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    await page.getByLabel(en.printRequest.fields.name).fill("A");
    await page.getByLabel(en.printRequest.fields.phone).fill("123");
    await page.getByLabel(en.printRequest.fields.details).fill("Hi");
    await page.getByRole("button", { name: en.printRequest.actions.submit }).click();

    await expect(page.getByText(en.validation.printRequestNameMin)).toBeVisible();
    await expect(page.getByText(en.validation.printRequestPhone)).toBeVisible();
    await expect(page.getByText(en.validation.printRequestDetailsMin)).toBeVisible();
  });

  test("renders the Arabic form in RTL", async ({ page }) => {
    await page.goto("/ar/print-request");

    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(
      page.getByRole("heading", { level: 1, name: ar.printRequest.page.title }),
    ).toBeVisible();
    await expect(page.getByLabel(ar.printRequest.fields.name)).toBeVisible();
    await expect(
      page.getByRole("button", { name: ar.printRequest.actions.submit }),
    ).toBeVisible();
  });

  test("selects multiple supported files and removes them", async ({ page }) => {
    await page.goto("/en/print-request");

    await page.locator('input[type="file"]').setInputFiles([
      {
        name: "bracket.stl",
        mimeType: "model/stl",
        buffer: Buffer.from("solid cube\nendsolid"),
      },
      {
        name: "drawing.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.7\n"),
      },
    ]);

    const list = page.getByTestId("print-request-file-list");
    await expect(list.getByText("bracket.stl")).toBeVisible();
    await expect(list.getByText("drawing.pdf")).toBeVisible();
    await expect(
      page.getByText(
        en.printRequest.attachments.count
          .replace("{count}", "2")
          .replace("{max}", "5"),
      ),
    ).toBeVisible();

    await page
      .getByRole("button", {
        name: en.printRequest.attachments.removeFile.replace("{name}", "bracket.stl"),
      })
      .click();
    await expect(list.getByText("bracket.stl")).toHaveCount(0);
  });

  test("rejects an unsupported extension before submission", async ({ page }) => {
    await page.goto("/en/print-request");

    await page.locator('input[type="file"]').setInputFiles({
      name: "payload.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from([0x4d, 0x5a, 0x00, 0x00]),
    });

    await expect(
      page.getByText(en.printRequest.fileErrors.fileType.replace("{name}", "payload.exe")),
    ).toBeVisible();
    await expect(page.getByTestId("print-request-file-list")).toHaveCount(0);
  });

  test("rejects a file larger than 50 MB before submission", async ({ page }, testInfo) => {
    test.slow();
    await page.goto("/en/print-request");

    // Playwright refuses inline buffers above 50 MB, so write a sparse file and
    // pass its path. The client rejects it before any upload starts.
    const hugePath = testInfo.outputPath("huge.stl");
    const fd = openSync(hugePath, "w");
    try {
      ftruncateSync(fd, 50 * 1024 * 1024 + 1);
    } finally {
      closeSync(fd);
    }

    await page.locator('input[type="file"]').setInputFiles(hugePath);

    await expect(
      page.getByText(en.printRequest.fileErrors.fileSize.replace("{name}", "huge.stl")),
    ).toBeVisible();
  });

  test("submits a request without attachments after validation", async ({ page }) => {
    test.skip(!submissionReady, submissionMissing);

    await page.goto("/en/print-request");

    const suffix = Date.now().toString();
    await page.getByLabel(en.printRequest.fields.name).fill(`E2E Customer ${suffix}`);
    await page.getByLabel(en.printRequest.fields.phone).fill("+963 944 555 777");
    await page
      .getByLabel(en.printRequest.fields.details)
      .fill("Please review this request. No files are attached yet.");
    await page.getByRole("button", { name: en.printRequest.actions.submit }).click();

    const success = page.getByTestId("print-request-success");
    await expect(success).toBeVisible();
    await expect(success.getByText(/\d{4,}/)).toBeVisible();
  });

  test("enforces the 3-request rate limit", async ({ request }) => {
    test.skip(
      process.env.E2E_PRINT_REQUEST_RATE_LIMIT !== "1" || !submissionReady,
      "Set E2E_PRINT_REQUEST_RATE_LIMIT=1 (plus submission configuration) to run the destructive rate-limit test.",
    );

    const statuses: number[] = [];
    const isolatedIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await request.post("/api/public/print-requests", {
        headers: { "x-forwarded-for": isolatedIp },
        data: {
          ...basePayload,
          customerName: `E2E Rate Limit ${Date.now()}-${attempt}`,
          submissionId: uniqueSubmissionId(),
        },
      });
      statuses.push(response.status());
    }

    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses[3]).toBe(429);
  });

  test("retries a failed direct upload and completes the request", async ({ page }) => {
    test.skip(
      process.env.E2E_PRINT_REQUEST_UPLOADS !== "1" || !submissionReady,
      "Set E2E_PRINT_REQUEST_UPLOADS=1 (plus submission configuration) to run the upload retry test.",
    );
    test.setTimeout(150_000);

    await page.route("**/storage/v1/upload/resumable**", (route) => route.abort());
    await page.goto("/en/print-request");

    await page.getByLabel(en.printRequest.fields.name).fill(`E2E Upload ${Date.now()}`);
    await page.getByLabel(en.printRequest.fields.phone).fill("+963 944 555 888");
    await page
      .getByLabel(en.printRequest.fields.details)
      .fill("Upload retry end-to-end request.");
    await page.locator('input[type="file"]').setInputFiles({
      name: "retry.stl",
      mimeType: "model/stl",
      buffer: Buffer.from("solid retry\nendsolid"),
    });

    await page.getByRole("button", { name: en.printRequest.actions.submit }).click();
    await expect(page.getByTestId("print-request-error")).toBeVisible({ timeout: 90_000 });

    await page.unroute("**/storage/v1/upload/resumable**");
    await page
      .getByRole("button", { name: en.printRequest.attachments.retrySubmission })
      .click();

    await expect(page.getByTestId("print-request-success")).toBeVisible({ timeout: 90_000 });
  });

  test.describe("mobile and themes", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("keeps the English and Arabic forms inside the viewport", async ({ page }) => {
      for (const locale of ["en", "ar"] as const) {
        await page.goto(`/${locale}/print-request`);
        await expect(page.getByTestId("print-request-form")).toBeVisible();

        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow).toBeLessThanOrEqual(1);
      }
    });

    test("renders the Arabic form in dark mode", async ({ page }) => {
      await page.goto("/ar/print-request");

      await page.getByRole("button", { name: ar.theme.toggle }).first().click();
      await page.getByRole("menuitemradio", { name: ar.theme.dark }).click();

      await expect(page.locator("html")).toHaveClass(/dark/);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect(page.getByTestId("print-request-form")).toBeVisible();
    });
  });
});

test.describe("admin print requests", () => {
  test("redirects unauthenticated visitors from the requests page", async ({ page }) => {
    await page.goto("/en/admin/requests");
    await expect(page).toHaveURL(/\/en\/admin\/login/);
  });

  test("rejects unauthenticated file downloads", async ({ request }) => {
    const response = await request.get(
      "/api/admin/print-requests/11111111-1111-4111-8111-111111111111/files/22222222-2222-4222-8222-222222222222",
    );
    expect(response.status()).toBe(401);
  });

  test("lists, opens, updates, marks read and deletes a request", async ({ page }) => {
    test.skip(!adminCredentials || !submissionReady, submissionMissing);

    const suffix = Date.now().toString();
    const customerName = `E2E Admin Request ${suffix}`;
    const createResponse = await createRequestThroughApi(page.request, {
      customerName,
      phone: "+963 944 999 000",
      details: "Request created for the admin dashboard end-to-end test.",
    });
    expect(createResponse.status()).toBe(200);

    await signIn(page);
    await goToAdminPage(page, "requests");
    await expect(
      page.getByRole("heading", { name: en.admin.requests.title }).first(),
    ).toBeVisible();

    await page
      .getByPlaceholder(en.admin.requests.filters.searchPlaceholder)
      .fill(customerName);
    const row = page.getByRole("row").filter({ hasText: customerName });
    await expect(row).toBeVisible({ timeout: 15_000 });

    await row.getByRole("link", { name: /\d{4,}/ }).click();
    await expect(page.getByText(customerName).first()).toBeVisible();

    const statusSelect = page.getByRole("combobox", { name: en.admin.requests.detail.statusLabel });
    await statusSelect.click();
    await page.getByRole("option", { name: en.admin.requests.statuses.reviewing }).click();
    await expect(page.getByText(en.admin.requests.detail.statusUpdated)).toBeVisible();

    const downloadResponse = await page.request.get(
      `/api/admin/print-requests/11111111-1111-4111-8111-111111111111/files/22222222-2222-4222-8222-222222222222`,
    );
    expect(downloadResponse.status()).toBe(404);

    await page.getByRole("button", { name: en.admin.requests.detail.delete }).click();
    const dialog = page.getByRole("alertdialog", {
      name: en.admin.requests.detail.deleteTitle,
    });
    await expect(dialog).toBeVisible();
    await dialog
      .getByRole("button", { name: en.admin.requests.detail.deleteConfirm })
      .click();

    await expect(page).toHaveURL(/\/en\/admin\/requests$/);
    await expect(page.getByText(en.admin.requests.detail.deleteSuccess)).toBeVisible();
  });
});
