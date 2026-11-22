"use client";

import {
  BellDot,
  Clock3,
  Eye,
  Inbox,
  Loader2,
  Search,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { PrintRequestStatusBadge } from "@/components/admin/requests/request-status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  printRequestStatuses,
  PRINT_REQUEST_PAGE_SIZE,
  type PrintRequestFilters,
  type PrintRequestListResult,
  type PrintRequestSort,
  type PrintRequestStats,
  type PrintRequestStatus,
} from "@/domain/print-request";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getPrintRequestStats, listPrintRequests } from "@/lib/actions/admin-print-requests";
import { formatDate } from "@/lib/format";
import { PRINT_REQUESTS_REFRESH_EVENT } from "@/components/admin/requests/use-unread-requests";

type StatusFilter = PrintRequestStatus | "all";

const STATUS_OPTIONS: StatusFilter[] = ["all", ...printRequestStatuses];

function StatsCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Inbox;
  tone?: "primary" | "warning";
}) {
  return (
    <Card className="flex items-center gap-3 p-4 shadow-soft">
      <span
        className={
          tone === "primary"
            ? "flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary-text"
            : tone === "warning"
              ? "flex size-10 items-center justify-center rounded-full bg-warning/10 text-warning"
              : "flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
        }
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <p className="text-xl font-semibold text-foreground">{value}</p>
      </div>
    </Card>
  );
}

export function RequestsManager() {
  const t = useTranslations("admin.requests");
  const locale = useLocale() as Locale;

  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<PrintRequestSort>("newest");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PrintRequestListResult | null>(null);
  const [stats, setStats] = useState<PrintRequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(false);

      const filters: PrintRequestFilters = {
        status,
        query: debouncedQuery,
        sort,
        page,
        pageSize: PRINT_REQUEST_PAGE_SIZE,
      };

      try {
        const [listResult, statsResult] = await Promise.all([
          listPrintRequests(filters),
          getPrintRequestStats(),
        ]);

        if (!active) return;

        if (!listResult.ok || !statsResult.ok) {
          setError(true);
          return;
        }

        setData(listResult.data);
        setStats(statsResult.data);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    const onRefresh = () => void load();
    window.addEventListener(PRINT_REQUESTS_REFRESH_EVENT, onRefresh);

    return () => {
      active = false;
      window.removeEventListener(PRINT_REQUESTS_REFRESH_EVENT, onRefresh);
    };
  }, [status, debouncedQuery, sort, page, reloadToken]);

  const hasFilters = status !== "all" || debouncedQuery.length > 0 || sort !== "newest";
  const totalPages = data?.totalPages ?? 1;

  function clearFilters() {
    setStatus("all");
    setQuery("");
    setSort("newest");
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
      </div>

      <Card className="p-4 shadow-soft">
        <div className="grid gap-3 lg:grid-cols-[1fr_13rem_11rem] lg:items-end">
          <div className="grid gap-2">
            <Label htmlFor="admin-request-search" className="text-xs text-muted-foreground">
              {t("filters.search")}
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="admin-request-search"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={t("filters.searchPlaceholder")}
                className="ps-9"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="admin-request-status" className="text-xs text-muted-foreground">
              {t("filters.status")}
            </Label>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as StatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger id="admin-request-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`statuses.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="admin-request-sort" className="text-xs text-muted-foreground">
              {t("filters.sort")}
            </Label>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value as PrintRequestSort);
                setPage(1);
              }}
            >
              <SelectTrigger id="admin-request-sort" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("sorts.newest")}</SelectItem>
                <SelectItem value="oldest">{t("sorts.oldest")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {hasFilters ? (
          <Button variant="ghost" size="sm" className="mt-3" onClick={clearFilters}>
            <X aria-hidden="true" />
            {t("filters.clear")}
          </Button>
        ) : null}
      </Card>

      {loading && !data ? (
        <div className="space-y-2">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm font-medium text-foreground">{t("loadError")}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setReloadToken((value) => value + 1)}
          >
            {t("retry")}
          </Button>
        </Card>
      ) : data && data.items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t("emptyTitle")}
          description={hasFilters ? t("emptyFilteredDescription") : t("emptyDescription")}
        />
      ) : data ? (
        <Card className="overflow-hidden shadow-soft">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("table.request")}</TableHead>
                  <TableHead>{t("table.customer")}</TableHead>
                  <TableHead>{t("table.status")}</TableHead>
                  <TableHead>{t("table.files")}</TableHead>
                  <TableHead>{t("table.date")}</TableHead>
                  <TableHead className="text-end">{t("table.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((request) => (
                  <TableRow key={request.id} className={!request.isRead ? "bg-primary/[0.035]" : undefined}>
                    <TableCell>
                      <Link
                        href={`/admin/requests/${request.id}`}
                        className="inline-flex items-center gap-2 font-mono text-xs font-medium text-foreground hover:text-primary-text"
                        dir="ltr"
                      >
                        {!request.isRead ? (
                          <span
                            className="size-2 rounded-full bg-primary"
                            title={t("unread")}
                            aria-label={t("unread")}
                          />
                        ) : null}
                        {request.requestNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="max-w-48 truncate text-sm font-medium text-foreground">
                        {request.customerName}
                      </p>
                      <p className="mt-0.5 max-w-48 truncate text-xs text-muted-foreground" dir="ltr">
                        {request.phone}
                      </p>
                    </TableCell>
                    <TableCell>
                      <PrintRequestStatusBadge status={request.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {request.fileCount > 0 ? t("filesCount", { count: request.fileCount }) : "—"}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {formatDate(request.createdAt, locale)}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/requests/${request.id}`} aria-label={t("view")}>
                          <Eye aria-hidden="true" />
                          <span className="hidden sm:inline">{t("view")}</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              {t("pagination.pageOf", { page: data.page, total: totalPages })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
                {t("pagination.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                {t("pagination.next")}
              </Button>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
