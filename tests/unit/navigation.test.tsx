import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";

import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";

import arMessages from "../../messages/ar.json";
import enMessages from "../../messages/en.json";

const { replace, setTheme } = vi.hoisted(() => ({
  replace: vi.fn(),
  setTheme: vi.fn(),
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
  usePathname: () => "/products",
  useRouter: () => ({ replace }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme }),
}));

describe("LocaleSwitcher", () => {
  it("switches locale while preserving path, query string and hash", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    window.history.replaceState({}, "", "/en/products?category=cat-3d-printers#catalog");

    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <LocaleSwitcher />
      </NextIntlClientProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: enMessages.language.switchTo.replace("{language}", "العربية") }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "العربية" }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/products?category=cat-3d-printers#catalog", {
        locale: "ar",
        scroll: false,
      });
    });
  });

  it("shows both language options with the active one marked", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <LocaleSwitcher />
      </NextIntlClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: /Switch language/ }));

    expect(await screen.findByRole("menuitem", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "العربية" })).toBeInTheDocument();
  });
});

describe("ThemeSwitcher", () => {
  it("sets the selected theme", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <ThemeSwitcher />
      </NextIntlClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: enMessages.theme.toggle }));
    await user.click(await screen.findByRole("menuitemradio", { name: enMessages.theme.dark }));

    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});

describe("SiteHeader", () => {
  it("links the brand logo to the admin sign-in page", () => {
    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <SiteHeader />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole("link", { name: enMessages.nav.adminLogin })).toHaveAttribute(
      "href",
      "/admin/login",
    );
  });

  it("opens the mobile menu and exposes localized navigation links", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    render(
      <NextIntlClientProvider locale="en" messages={enMessages}>
        <SiteHeader />
      </NextIntlClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: enMessages.nav.openMenu }));

    const dialog = await screen.findByRole("dialog", { name: enMessages.nav.menuTitle });
    expect(dialog).toBeInTheDocument();
    expect(withinDialog(dialog, enMessages.nav.products)).toBeInTheDocument();
    expect(withinDialog(dialog, enMessages.nav.contact)).toBeInTheDocument();
  });

  it("renders Arabic menu labels when the locale is Arabic", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });

    render(
      <NextIntlClientProvider locale="ar" messages={arMessages}>
        <SiteHeader />
      </NextIntlClientProvider>,
    );

    await user.click(screen.getByRole("button", { name: arMessages.nav.openMenu }));

    const dialog = await screen.findByRole("dialog", { name: arMessages.nav.menuTitle });
    expect(withinDialog(dialog, arMessages.nav.products)).toBeInTheDocument();
  });
});

function withinDialog(dialog: HTMLElement, linkName: string): HTMLElement {
  const links = Array.from(dialog.querySelectorAll("a"));
  const link = links.find((candidate) => candidate.textContent?.trim() === linkName);
  if (!link) throw new Error(`Link "${linkName}" was not found in the mobile menu.`);
  return link;
}
