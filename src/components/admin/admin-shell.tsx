"use client";

import {
  ArrowLeft,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  RotateCcw,
  ShieldCheck,
  Tags,
  UserRound,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { DemoDataProvider, useDemoData } from "@/components/admin/demo-data-provider";
import { AdminSessionProvider } from "@/components/admin/admin-session-provider";
import { useUnreadPrintRequests } from "@/components/admin/requests/use-unread-requests";
import { BrandLogo } from "@/components/brand/brand-logo";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ThemeSwitcher } from "@/components/layout/theme-switcher";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { AdminSession } from "@/domain/admin";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { localeDirection, type Locale } from "@/i18n/routing";
import { signOutAdmin } from "@/lib/actions/admin-auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", labelKey: "overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/products", labelKey: "products", icon: Package, exact: false },
  { href: "/admin/categories", labelKey: "categories", icon: Tags, exact: false },
  { href: "/admin/requests", labelKey: "requests", icon: Inbox, exact: false },
  { href: "/admin/profile", labelKey: "profile", icon: UserRound, exact: false },
] as const;

function isActive(pathname: string, href: string, exact: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({
  onNavigate,
  unreadCount,
}: {
  onNavigate?: () => void;
  unreadCount: number;
}) {
  const t = useTranslations("admin");
  const pathname = usePathname();

  return (
    <nav aria-label={t("nav.menuTitle")} className="flex-1 space-y-1 overflow-y-auto p-3">
      <p className="px-3 pt-2 pb-1 text-[0.62rem] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        {t("nav.workspace")}
      </p>
      {navItems.map((item) => {
        const active = isActive(pathname, item.href, item.exact);
        return (
          <Button
            key={item.href}
            asChild
            variant="ghost"
            className={cn(
              "h-10 w-full justify-start gap-2.5 px-3 text-sm font-medium text-muted-foreground",
              active &&
                "bg-sidebar-accent font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {t(`nav.${item.labelKey}`)}
              {item.labelKey === "requests" && unreadCount > 0 ? (
                <span
                  className="ms-auto flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-[0.65rem] font-semibold text-primary-foreground"
                  title={t("nav.unreadRequests", { count: unreadCount })}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}

interface AdminSidebarProps {
  onNavigate?: () => void;
  onRequestReset: () => void;
  onSignOut: () => void;
  unreadCount: number;
}

function AdminSidebar({
  onNavigate,
  onRequestReset,
  onSignOut,
  unreadCount,
}: AdminSidebarProps) {
  const t = useTranslations("admin");
  const router = useRouter();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-(--header-height) items-center border-b border-sidebar-border px-5">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="inline-flex shrink-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <BrandLogo className="w-52" />
        </Link>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs font-medium text-primary-text">
          <ShieldCheck className="size-3.5" aria-hidden="true" />
          {t("common.demoBadge")}
        </div>
      </div>

      <SidebarNav onNavigate={onNavigate} unreadCount={unreadCount} />

      <div className="space-y-1 border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          className="h-9 w-full justify-start gap-2.5 px-3 text-sm text-muted-foreground"
          onClick={onRequestReset}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t("common.resetDemo")}
        </Button>
        <Button
          variant="ghost"
          className="h-9 w-full justify-start gap-2.5 px-3 text-sm text-muted-foreground"
          onClick={() => {
            onNavigate?.();
            router.push("/");
          }}
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t("nav.backToSite")}
        </Button>
        <Button
          variant="ghost"
          className="h-9 w-full justify-start gap-2.5 px-3 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onSignOut}
        >
          <LogOut className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t("common.logout")}
        </Button>
      </div>
    </div>
  );
}

function AdminFrame({ session, children }: { session: AdminSession; children: React.ReactNode }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale() as Locale;
  const { resetDemo } = useDemoData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const unreadCount = useUnreadPrintRequests();

  const current = useMemo(
    () => navItems.find((item) => isActive(pathname, item.href, item.exact)) ?? navItems[0],
    [pathname],
  );

  async function handleSignOut() {
    await signOutAdmin();
    router.replace("/admin/login");
    router.refresh();
  }

  async function handleReset() {
    setResetting(true);
    try {
      await resetDemo();
      toast.success(t("common.resetSuccess"));
      setResetOpen(false);
    } catch {
      toast.error(t("common.resetError"));
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-muted/30 lg:grid lg:grid-cols-[16.5rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-e border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
        <AdminSidebar onRequestReset={() => setResetOpen(true)} onSignOut={() => void handleSignOut()} unreadCount={unreadCount} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-(--header-height) items-center justify-between gap-3 border-b border-border bg-background px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("nav.openMenu")}>
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side={localeDirection[locale] === "rtl" ? "right" : "left"}
                className="w-[min(18rem,85vw)] p-0"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>{t("nav.menuTitle")}</SheetTitle>
                  <SheetDescription>{t("common.demoBadge")}</SheetDescription>
                </SheetHeader>
                <AdminSidebar
                  onNavigate={() => setMobileOpen(false)}
                  onRequestReset={() => {
                    setMobileOpen(false);
                    setResetOpen(true);
                  }}
                  onSignOut={() => void handleSignOut()}
                  unreadCount={unreadCount}
                />
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <p className="text-[0.62rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                {t("common.dashboard")}
              </p>
              <h1 className="truncate text-sm font-semibold text-foreground">
                {t(`nav.${current.labelKey}`)}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <LocaleSwitcher compact />
            <ThemeSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="ms-1 gap-2 px-2">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary-text">
                    {session.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-36 truncate text-xs font-medium text-muted-foreground sm:block">
                    {session.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <span className="block text-[0.65rem] text-muted-foreground uppercase">
                    {t("common.signedInAs")}
                  </span>
                  <span className="mt-0.5 block truncate text-sm font-medium text-foreground">
                    {session.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => router.push("/admin/profile")}>
                  <UserRound className="size-4" aria-hidden="true" />
                  {t("nav.profile")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => void handleSignOut()}>
                  <LogOut className="size-4 rtl:rotate-180" aria-hidden="true" />
                  {t("common.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.resetTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common.resetDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={resetting}
              onClick={(event) => {
                event.preventDefault();
                void handleReset();
              }}
            >
              {t("common.resetDemo")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: React.ReactNode;
}) {
  return (
    <AdminSessionProvider session={session}>
      <DemoDataProvider>
        <AdminFrame session={session}>{children}</AdminFrame>
      </DemoDataProvider>
    </AdminSessionProvider>
  );
}
