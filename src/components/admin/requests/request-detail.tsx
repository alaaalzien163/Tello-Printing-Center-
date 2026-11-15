"use client";

import {
  ArrowLeft,
  Download,
  FileText,
  MessageCircle,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PrintRequestStatusBadge } from "@/components/admin/requests/request-status-badge";
import { dispatchPrintRequestsRefresh } from "@/components/admin/requests/use-unread-requests";
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
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  adminPrintRequestStatuses,
  isAdminPrintRequestStatus,
  type AdminPrintRequestStatus,
  type PrintRequestDetail,
} from "@/domain/print-request";
import { Link, useRouter } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  deletePrintRequest,
  updatePrintRequestNotes,
  updatePrintRequestStatus,
} from "@/lib/actions/admin-print-requests";
import { formatDate } from "@/lib/format";
import { buildWhatsAppCustomerUrl, externalLinkProps } from "@/lib/whatsapp";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / (1024 * 102.4)) / 10} MB`;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

interface RequestDetailProps {
  request: PrintRequestDetail;
}

export function RequestDetail({ request }: RequestDetailProps) {
  const t = useTranslations("admin.requests");
  const td = useTranslations("admin.requests.detail");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [status, setStatus] = useState<AdminPrintRequestStatus>(
    isAdminPrintRequestStatus(request.status) ? request.status : "pending",
  );
  const [notes, setNotes] = useState(request.adminNotes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    dispatchPrintRequestsRefresh();
  }, []);

  const whatsappHref = buildWhatsAppCustomerUrl(request.phone, {
    locale,
    requestNumber: request.requestNumber,
    customerName: request.customerName,
  });

  async function changeStatus(next: AdminPrintRequestStatus) {
    if (next === status || updatingStatus) return;
    const previous = status;
    setStatus(next);
    setUpdatingStatus(true);

    try {
      const result = await updatePrintRequestStatus(request.id, next);
      if (!result.ok) {
        setStatus(previous);
        toast.error(td("statusError"));
        return;
      }
      toast.success(td("statusUpdated"));
      dispatchPrintRequestsRefresh();
    } catch {
      setStatus(previous);
      toast.error(td("statusError"));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function saveNotes() {
    if (savingNotes) return;
    setSavingNotes(true);

    try {
      const result = await updatePrintRequestNotes(request.id, notes);
      if (!result.ok) {
        toast.error(td("notes.error"));
        return;
      }
      toast.success(td("notes.saved"));
    } catch {
      toast.error(td("notes.error"));
    } finally {
      setSavingNotes(false);
    }
  }

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);

    try {
      const result = await deletePrintRequest(request.id);
      if (!result.ok) {
        toast.error(result.error === "STORAGE" ? td("deleteStorageError") : td("deleteError"));
        return;
      }

      toast.success(td("deleteSuccess"));
      dispatchPrintRequestsRefresh();
      setDeleteOpen(false);
      router.push("/admin/requests");
      router.refresh();
    } catch {
      toast.error(td("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ms-2 mb-2 text-muted-foreground">
            <Link href="/admin/requests">
              <ArrowLeft className="rtl:rotate-180" aria-hidden="true" />
              {td("back")}
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-mono text-xl font-semibold tracking-tight text-foreground" dir="ltr">
              {request.requestNumber}
            </h2>
            <PrintRequestStatusBadge status={status} />
            {!request.isRead ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.65rem] font-semibold tracking-wide text-primary-text uppercase">
                {t("unread")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {td("submittedAt")}: {formatDate(request.createdAt, locale)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {whatsappHref ? (
            <Button asChild variant="outline">
              <a href={whatsappHref} {...externalLinkProps}>
                <MessageCircle className="text-whatsapp" aria-hidden="true" />
                {td("whatsapp")}
              </a>
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 aria-hidden="true" />
            {td("delete")}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="space-y-5">
          <Card className="gap-0 p-5 shadow-soft">
            <h3 className="text-sm font-semibold text-foreground">{td("details")}</h3>
            <Separator className="my-4" />
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailRow label={td("customer")}>
                <span className="inline-flex items-center gap-2">
                  <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
                  {request.customerName}
                </span>
              </DetailRow>
              <DetailRow label={td("phone")}>
                <span dir="ltr">{request.phone}</span>
              </DetailRow>
              <DetailRow label={td("locale")}>
                {request.locale === "ar" ? td("arabic") : td("english")}
              </DetailRow>
              <DetailRow label={td("status")}>
                <PrintRequestStatusBadge status={status} />
              </DetailRow>
            </dl>
            <Separator className="my-4" />
            <p className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
              {td("details")}
            </p>
            <p className="mt-2 text-sm leading-7 break-words whitespace-pre-wrap text-foreground">
              {request.details}
            </p>
          </Card>

          <Card className="gap-0 p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">{td("files")}</h3>
              <span className="text-xs text-muted-foreground">
                {t("filesCount", { count: request.files.length })}
              </span>
            </div>
            <Separator className="my-4" />

            {request.files.length === 0 ? (
              <p className="text-sm text-muted-foreground">{td("noFiles")}</p>
            ) : (
              <ul className="space-y-2">
                {request.files.map((file) => (
                  <li
                    key={file.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-background/50 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <FileText className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground" dir="auto">
                          {file.originalName}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                          <span className="uppercase">{file.extension}</span>
                          <span aria-hidden="true">·</span>
                          <span dir="ltr">{formatBytes(file.sizeBytes)}</span>
                          <span aria-hidden="true">·</span>
                          <span dir="ltr" className="truncate">
                            {file.contentType}
                          </span>
                        </p>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="shrink-0">
                      <a
                        href={`/api/admin/print-requests/${request.id}/files/${file.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid={`download-${file.id}`}
                      >
                        <Download aria-hidden="true" />
                        {td("download")}
                      </a>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24">
          <Card className="gap-0 p-5 shadow-soft">
            <Label htmlFor="request-status" className="text-sm font-semibold text-foreground">
              {td("statusLabel")}
            </Label>
            <Select
              value={status}
              onValueChange={(value) => void changeStatus(value as AdminPrintRequestStatus)}
              disabled={updatingStatus}
            >
              <SelectTrigger id="request-status" className="mt-3 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {adminPrintRequestStatuses.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`statuses.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-3">
              <PrintRequestStatusBadge status={status} />
            </div>
          </Card>

          <Card className="gap-0 p-5 shadow-soft">
            <h3 className="text-sm font-semibold text-foreground">{td("notes.title")}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {td("notes.description")}
            </p>
            <Textarea
              id="request-notes"
              className="mt-3 min-h-32"
              maxLength={5000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder={td("notes.placeholder")}
            />
            <Button
              className="mt-3 w-full"
              onClick={() => void saveNotes()}
              disabled={savingNotes || notes === (request.adminNotes ?? "")}
            >
              <Save aria-hidden="true" />
              {savingNotes ? td("notes.saving") : td("notes.save")}
            </Button>
          </Card>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{td("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{td("deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void confirmDelete();
              }}
            >
              <Trash2 aria-hidden="true" />
              {td("deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
