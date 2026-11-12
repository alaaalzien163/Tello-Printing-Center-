"use client";

import { Menu } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Logo } from "@/components/brand/logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Link, usePathname } from "@/i18n/navigation";
import { localeDirection, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  labelKey: "home" | "products" | "about" | "contact";
}

const navItems: NavItem[] = [
  { href: "/", labelKey: "home" },
  { href: "/products", labelKey: "products" },
  { href: "/#about", labelKey: "about" },
  { href: "/contact", labelKey: "contact" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href.includes("#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "glass-header sticky top-0 z-40 w-full border-b border-transparent transition-[border-color,box-shadow] duration-200",
        scrolled && "border-border/80 shadow-soft",
      )}
    >
      <div className="container-page flex h-(--header-height) items-center justify-between gap-3">
        <Link
          href="/admin/login"
          className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
          aria-label={t("adminLogin")}
        >
          <Logo />
        </Link>

        <nav aria-label={t("mainNav")} className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Button key={item.href} asChild variant="ghost" size="sm" className="px-3.5">
              <Link
                href={item.href}
                aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                className={cn(
                  "text-[0.82rem] text-muted-foreground",
                  isActivePath(pathname, item.href) && "bg-muted text-foreground",
                )}
              >
                {t(item.labelKey)}
              </Link>
            </Button>
          ))}
        </nav>

        <div className="hidden items-center gap-1 lg:flex">
          <ThemeSwitcher />
          <LocaleSwitcher />
          <Button asChild size="sm" className="ms-2 h-9 px-4">
            <Link href="/products">{t("products")}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-0.5 lg:hidden">
          <ThemeSwitcher />
          <LocaleSwitcher compact />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("openMenu")}>
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side={localeDirection[locale] === "rtl" ? "left" : "right"}
              className="w-[min(20rem,85vw)]"
            >
              <SheetHeader>
                <SheetTitle>{t("menuTitle")}</SheetTitle>
                <SheetDescription className="sr-only">{t("mainNav")}</SheetDescription>
              </SheetHeader>
              <nav aria-label={t("mainNav")} className="flex flex-col gap-1 px-3">
                {navItems.map((item) => (
                  <SheetClose key={item.href} asChild>
                    <Link
                      href={item.href}
                      aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
                      className={cn(
                        "rounded-lg px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                        isActivePath(pathname, item.href) && "bg-muted text-foreground",
                      )}
                    >
                      {t(item.labelKey)}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto border-t border-border p-4">
                <SheetClose asChild>
                  <Button asChild className="w-full">
                    <Link href="/products">{t("products")}</Link>
                  </Button>
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
