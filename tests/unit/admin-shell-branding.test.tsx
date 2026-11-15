import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { AdminShell } from "@/components/admin/admin-shell";

import arMessages from "../../messages/ar.json";
import enMessages from "../../messages/en.json";

vi.mock("@/components/admin/admin-session-provider", () => ({
  AdminSessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/admin/demo-data-provider", () => ({
  DemoDataProvider: ({ children }: { children: React.ReactNode }) => children,
  useDemoData: () => ({ resetDemo: vi.fn() }),
}));

vi.mock("@/components/admin/requests/use-unread-requests", () => ({
  useUnreadPrintRequests: () => 0,
}));

vi.mock("@/lib/actions/admin-auth", () => ({
  signOutAdmin: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: () => "/admin",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));

const session = {
  email: "admin@example.com",
  name: "Admin",
  signedInAt: new Date("2026-11-15T10:00:00.000Z").toISOString(),
};

describe("AdminShell branding", () => {
  it("links the brand logo to the admin overview page", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <AdminShell session={session}>
          <div>content</div>
        </AdminShell>
      </NextIntlClientProvider>,
    );

    const logo = screen.getByRole("link", { name: enMessages.common.logoAlt });
    expect(logo).toHaveAttribute("href", "/admin");
    const image = screen.getByRole("img", { name: enMessages.common.logoAlt });
    expect(decodeURIComponent(image.getAttribute("src") ?? "")).toContain(
      "/images/logo-tello.png",
    );
  });

  it("uses the Arabic alt text in the Arabic dashboard", () => {
    render(
      <NextIntlClientProvider locale="ar" messages={arMessages}>
        <AdminShell session={session}>
          <div>content</div>
        </AdminShell>
      </NextIntlClientProvider>,
    );

    expect(
      screen.getByRole("link", { name: arMessages.common.logoAlt }),
    ).toHaveAttribute("href", "/admin");
  });
});
