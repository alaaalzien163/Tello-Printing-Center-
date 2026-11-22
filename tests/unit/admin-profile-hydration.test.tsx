import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AdminProfile } from "@/components/admin/admin-profile";

import enMessages from "../../messages/en.json";

// `next-themes` resolves the stored preference on the client. The server sees
// `undefined`; the hydration render sees the resolved value. The test drives
// both paths to prove the profile page never branches on the unresolved theme.
const themeState = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: themeState.value, setTheme: vi.fn() }),
}));

vi.mock("@/components/admin/admin-session-provider", () => ({
  useAdminSession: () => ({ email: "admin@example.com", name: "Admin" }),
}));

vi.mock("@/components/admin/demo-data-provider", () => ({
  useDemoData: () => ({
    profile: { name: "Admin", role: "admin" },
    reload: vi.fn(),
  }),
}));

vi.mock("@/components/admin/admin-password-form", () => ({
  AdminPasswordForm: () => null,
}));

vi.mock("@/repositories", () => ({
  getRepositories: () => ({ profile: { update: vi.fn() } }),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: () => "/admin/profile",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderProfile() {
  return (
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <AdminProfile />
    </NextIntlClientProvider>
  );
}

describe("AdminProfile theme hydration", () => {
  it("does not mark a theme button as pressed in the server HTML", () => {
    themeState.value = "system";

    const html = renderToString(renderProfile());
    const pressedButtons = html.match(/aria-pressed="true"/g) ?? [];

    // Only the active locale button is pressed on the server. If the theme
    // buttons branched on the client-resolved theme, "System" would be pressed
    // too and React would report a hydration mismatch.
    expect(pressedButtons).toHaveLength(1);
  });

  it("marks the resolved theme only after the client mounts", () => {
    themeState.value = "system";

    render(renderProfile());

    expect(
      screen.getByRole("button", { name: enMessages.theme.system }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: enMessages.theme.light }),
    ).toHaveAttribute("aria-pressed", "false");
  });
});
