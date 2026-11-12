import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { Breadcrumbs } from "@/components/shared/breadcrumbs";

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const items = [
  { label: "Home", href: "/" },
  { label: "3D Printers", href: "/products#catalog" },
  { label: "Tello Forge X1" },
];

describe("Breadcrumbs", () => {
  it("renders a labeled navigation landmark with links and the current page", () => {
    render(<Breadcrumbs label="Breadcrumb" items={items} />);

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(nav).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "3D Printers" })).toHaveAttribute(
      "href",
      "/products#catalog",
    );

    const current = screen.getByText("Tello Forge X1");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Tello Forge X1" })).not.toBeInTheDocument();
  });

  it("marks separators as decorative", () => {
    const { container } = render(<Breadcrumbs label="Breadcrumb" items={items} />);

    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(items.length - 1);
  });

  it("renders Home > Product when category data is missing", () => {
    render(<Breadcrumbs label="Breadcrumb" items={[items[0]!, { label: "Tello Forge X1" }]} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText("3D Printers")).not.toBeInTheDocument();
    expect(screen.getByText("Tello Forge X1")).toHaveAttribute("aria-current", "page");
  });

  it("truncates long product names to protect the layout", () => {
    const longName = "A very long product name that should not break the layout";
    render(<Breadcrumbs label="Breadcrumb" items={[{ label: "Home", href: "/" }, { label: longName }]} />);

    expect(screen.getByText(longName)).toHaveClass("truncate");
  });
});
