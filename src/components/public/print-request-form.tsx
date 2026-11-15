"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  FileUp,
  Loader2,
  Paperclip,
  RotateCcw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { TurnstileWidget } from "@/components/public/turnstile-widget";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PrintRequestFileInput } from "@/domain/print-request";
import type { Locale } from "@/i18n/routing";
import {
  fileExtension,
  MAX_PRINT_REQUEST_FILE_BYTES,
  MAX_PRINT_REQUEST_FILES,
  MAX_PRINT_REQUEST_TOTAL_BYTES,
  PRINT_REQUEST_ACCEPT_ATTRIBUTE,
  validateFileList,
  validateFileMetadata,
  type FileValidationIssue,
} from "@/lib/print-requests/files";
import {
  PrintRequestUploadError,
  uploadPrintRequestFile,
  type PrintRequestUploadTarget,
} from "@/lib/print-requests/upload-client";
import {
  createPrintRequestFormSchema,
  type PrintRequestFieldsValues,
} from "@/schemas/print-request";
import { cn } from "@/lib/utils";

type AttachmentStatus = "pending" | "uploading" | "uploaded" | "error";

interface Attachment {
  key: string;
  file: File;
  status: AttachmentStatus;
  progress: number;
  fileId?: string;
  target?: PrintRequestUploadTarget;
}

type SubmissionPhase = "idle" | "initiating" | "uploading" | "finalizing";

type FileErrorKey =
  | "fileErrors.fileCount"
  | "fileErrors.fileSize"
  | "fileErrors.fileTotalSize"
  | "fileErrors.fileType"
  | "fileErrors.fileEmpty"
  | "fileErrors.fileName";

type SubmitErrorKey =
  | "errors.invalidInput"
  | "errors.spam"
  | "errors.captcha"
  | "errors.captchaRequired"
  | "errors.captchaNotConfigured"
  | "errors.rateLimited"
  | "errors.notConfigured"
  | "errors.serviceUnavailable"
  | "errors.uploadIncomplete"
  | "errors.storage"
  | "errors.notFound"
  | "errors.network"
  | "errors.generic";

const API_ERROR_KEYS: Record<string, SubmitErrorKey> = {
  INVALID_INPUT: "errors.invalidInput",
  SPAM: "errors.spam",
  CAPTCHA: "errors.captcha",
  CAPTCHA_NOT_CONFIGURED: "errors.captchaNotConfigured",
  RATE_LIMITED: "errors.rateLimited",
  SERVICE_UNAVAILABLE: "errors.serviceUnavailable",
  NOT_CONFIGURED: "errors.notConfigured",
  UPLOAD_INCOMPLETE: "errors.uploadIncomplete",
  STORAGE: "errors.storage",
  NOT_FOUND: "errors.notFound",
  UNKNOWN: "errors.generic",
};

const FILE_ISSUE_KEYS: Record<FileValidationIssue["code"], FileErrorKey> = {
  FILE_COUNT: "fileErrors.fileCount",
  FILE_SIZE: "fileErrors.fileSize",
  FILE_TOTAL_SIZE: "fileErrors.fileTotalSize",
  FILE_TYPE: "fileErrors.fileType",
  FILE_EMPTY: "fileErrors.fileEmpty",
  FILE_NAME: "fileErrors.fileName",
};

interface InitiateResponse {
  requestId: string;
  requestNumber: string;
  status: "pending" | "uploading";
  uploads: PrintRequestUploadTarget[];
}

function createSubmissionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / (1024 * 102.4)) / 10} MB`;
}

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

interface PrintRequestFormProps {
  turnstileSiteKey: string | null;
}

export function PrintRequestForm({ turnstileSiteKey }: PrintRequestFormProps) {
  const t = useTranslations("printRequest");
  const tv = useTranslations("validation");
  const locale = useLocale() as Locale;
  const fieldId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const schema = useMemo(() => createPrintRequestFormSchema(tv), [tv]);
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<PrintRequestFieldsValues>({
    resolver: zodResolver(schema),
    defaultValues: { customerName: "", phone: "", details: "" },
    mode: "onBlur",
  });

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dragging, setDragging] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [phase, setPhase] = useState<SubmissionPhase>("idle");
  const [submitError, setSubmitError] = useState<SubmitErrorKey | null>(null);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState<number | null>(null);
  const [successNumber, setSuccessNumber] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const submissionIdRef = useRef<string | null>(null);
  const lastValuesRef = useRef<PrintRequestFieldsValues | null>(null);

  const submitting = phase !== "idle";

  function getSubmissionId(): string {
    if (!submissionIdRef.current) submissionIdRef.current = createSubmissionId();
    return submissionIdRef.current;
  }

  function fileErrorMessage(issue: FileValidationIssue): string {
    return t(FILE_ISSUE_KEYS[issue.code], { name: issue.fileName ?? "" });
  }

  function updateAttachment(key: string, patch: Partial<Attachment>) {
    setAttachments((current) =>
      current.map((attachment) =>
        attachment.key === key ? { ...attachment, ...patch } : attachment,
      ),
    );
  }

  function addFiles(incoming: FileList | File[]) {
    if (submitting || locked) return;
    setSubmitError(null);
    setRetryAfterSeconds(null);

    const existingKeys = new Set(attachments.map((attachment) => attachment.key));
    const accepted: Attachment[] = [];
    let runningTotal = attachments.reduce((sum, attachment) => sum + attachment.file.size, 0);
    let count = attachments.length;

    for (const file of Array.from(incoming)) {
      const key = fileKey(file);
      if (existingKeys.has(key)) continue;

      if (count >= MAX_PRINT_REQUEST_FILES) {
        toast.error(t("fileErrors.fileCount"));
        break;
      }

      const issue = validateFileMetadata(file);
      if (issue) {
        toast.error(fileErrorMessage(issue));
        continue;
      }

      if (runningTotal + file.size > MAX_PRINT_REQUEST_TOTAL_BYTES) {
        toast.error(t("fileErrors.fileTotalSize"));
        break;
      }

      existingKeys.add(key);
      runningTotal += file.size;
      count += 1;
      accepted.push({
        key,
        file,
        status: "pending",
        progress: 0,
      });
    }

    if (accepted.length === 0) return;
    setAttachments((current) => [...current, ...accepted]);
  }

  function removeAttachment(key: string) {
    if (submitting || locked) return;
    setSubmitError(null);
    setAttachments((current) => current.filter((attachment) => attachment.key !== key));
  }

  function startOver() {
    if (submitting) return;
    submissionIdRef.current = null;
    lastValuesRef.current = null;
    setLocked(false);
    setAttachments([]);
    setSubmitError(null);
    setRetryAfterSeconds(null);
    setTurnstileToken("");
    setTurnstileReset((value) => value + 1);
    reset({ customerName: "", phone: "", details: "" });
  }

  function assignTargets(
    current: Attachment[],
    uploads: PrintRequestUploadTarget[],
  ): Attachment[] {
    const next = [...current];

    uploads.forEach((upload, index) => {
      let targetIndex = next.findIndex((attachment) => attachment.fileId === upload.fileId);
      if (targetIndex < 0 && next[index]) targetIndex = index;
      if (targetIndex < 0) return;

      next[targetIndex] = {
        ...next[targetIndex],
        fileId: upload.fileId,
        target: upload,
      };
    });

    return next;
  }

  async function submitValues(
    values: PrintRequestFieldsValues,
    options: { resume?: boolean } = {},
  ) {
    if (submitting) return;

    const issue = validateFileList(attachments.map((attachment) => attachment.file));
    if (issue) {
      setSubmitError(null);
      toast.error(fileErrorMessage(issue));
      return;
    }

    if (turnstileSiteKey && !turnstileToken && !options.resume) {
      setSubmitError("errors.captchaRequired");
      return;
    }

    lastValuesRef.current = values;
    setSubmitError(null);
    setRetryAfterSeconds(null);
    setPhase("initiating");

    const submissionId = getSubmissionId();
    const files: PrintRequestFileInput[] = attachments.map((attachment) => ({
      name: attachment.file.name,
      size: attachment.file.size,
      type: attachment.file.type,
    }));

    try {
      const response = await fetch("/api/public/print-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customerName: values.customerName,
          phone: values.phone,
          details: values.details,
          locale,
          submissionId,
          turnstileToken,
          website: honeypot,
          files,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setSubmitError(API_ERROR_KEYS[payload.error ?? ""] ?? "errors.generic");
        if (response.status === 429) {
          const header = Number(response.headers.get("retry-after"));
          setRetryAfterSeconds(Number.isFinite(header) && header > 0 ? header : null);
        }
        setTurnstileReset((value) => value + 1);
        return;
      }

      const payload = (await response.json()) as InitiateResponse;
      setLocked(true);

      if (payload.status === "pending" && payload.uploads.length === 0) {
        setSuccessNumber(payload.requestNumber);
        resetFormAfterSuccess();
        return;
      }

      setPhase("uploading");
      let working = assignTargets(attachments, payload.uploads);
      setAttachments(working);

      for (const attachment of working) {
        if (!attachment.target || attachment.status === "uploaded") continue;

        updateAttachment(attachment.key, {
          status: "uploading",
          progress: 0,
        });

        try {
          const handle = uploadPrintRequestFile({
            file: attachment.file,
            target: attachment.target,
            onProgress: (percent) => {
              updateAttachment(attachment.key, { progress: percent });
            },
          });

          await handle.promise;
          updateAttachment(attachment.key, {
            status: "uploaded",
            progress: 100,
          });

          working = working.map((item) =>
            item.key === attachment.key
              ? { ...item, status: "uploaded", progress: 100 }
              : item,
          );
          setAttachments(working);
        } catch (error) {
          updateAttachment(attachment.key, {
            status: "error",
            progress: 0,
          });
          setSubmitError(
            error instanceof PrintRequestUploadError && error.code === "NOT_CONFIGURED"
              ? "errors.notConfigured"
              : "errors.uploadIncomplete",
          );
          setPhase("idle");
          return;
        }
      }

      setPhase("finalizing");
      const completeResponse = await fetch("/api/public/print-requests/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: payload.requestId, submissionId }),
      });

      if (!completeResponse.ok) {
        const completePayload = (await completeResponse.json().catch(() => ({}))) as {
          error?: string;
        };
        setSubmitError(
          API_ERROR_KEYS[completePayload.error ?? ""] ?? "errors.uploadIncomplete",
        );
        return;
      }

      setSuccessNumber(payload.requestNumber);
      resetFormAfterSuccess();
    } catch (error) {
      if (error instanceof PrintRequestUploadError && error.code === "NOT_CONFIGURED") {
        setSubmitError("errors.notConfigured");
      } else {
        setSubmitError("errors.network");
      }
    } finally {
      setPhase("idle");
    }
  }

  function resetFormAfterSuccess() {
    submissionIdRef.current = null;
    lastValuesRef.current = null;
    setLocked(false);
    setAttachments([]);
    setTurnstileToken("");
    setTurnstileReset((value) => value + 1);
    reset({ customerName: "", phone: "", details: "" });
  }

  function onSubmit(values: PrintRequestFieldsValues) {
    void submitValues(values);
  }

  function retry() {
    if (submitting) return;
    const values = lastValuesRef.current ?? getValues();
    void submitValues(values, { resume: true });
  }

  const totalBytes = attachments.reduce((sum, attachment) => sum + attachment.file.size, 0);
  const overallProgress =
    attachments.length === 0
      ? 0
      : Math.round(
          attachments.reduce(
            (sum, attachment) =>
              sum + (attachment.status === "uploaded" ? 100 : attachment.progress),
            0,
          ) / attachments.length,
        );

  const phaseLabel =
    phase === "initiating"
      ? t("progress.initiating")
      : phase === "uploading"
        ? t("progress.uploading")
        : phase === "finalizing"
          ? t("progress.finalizing")
          : null;

  if (successNumber) {
    return (
      <div
        className="rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-8"
        role="status"
        data-testid="print-request-success"
      >
        <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary-text">
          <CheckCircle2 className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-foreground">{t("success.title")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t("success.description")}
        </p>
        <div className="mt-5 rounded-xl border border-border bg-muted/40 px-4 py-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("success.requestNumber")}
          </p>
          <p className="mt-1 font-mono text-lg font-semibold text-foreground" dir="ltr">
            {successNumber}
          </p>
        </div>
        <Button className="mt-6" onClick={() => setSuccessNumber(null)}>
          {t("success.submitAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(onSubmit)(event);
      }}
      noValidate
      className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-7"
      data-testid="print-request-form"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${fieldId}-name`}>
            {t("fields.name")} <span aria-hidden="true">*</span>
          </Label>
          <Input
            id={`${fieldId}-name`}
            autoComplete="name"
            aria-invalid={Boolean(errors.customerName)}
            aria-describedby={errors.customerName ? `${fieldId}-name-error` : undefined}
            placeholder={t("fields.namePlaceholder")}
            {...register("customerName")}
          />
          {errors.customerName ? (
            <p id={`${fieldId}-name-error`} className="text-xs text-destructive">
              {errors.customerName.message}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor={`${fieldId}-phone`}>
            {t("fields.phone")} <span aria-hidden="true">*</span>
          </Label>
          <Input
            id={`${fieldId}-phone`}
            type="tel"
            inputMode="tel"
            dir="ltr"
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={
              errors.phone ? `${fieldId}-phone-error` : `${fieldId}-phone-hint`
            }
            placeholder={t("fields.phonePlaceholder")}
            {...register("phone")}
          />
          {errors.phone ? (
            <p id={`${fieldId}-phone-error`} className="text-xs text-destructive">
              {errors.phone.message}
            </p>
          ) : (
            <p id={`${fieldId}-phone-hint`} className="text-xs text-muted-foreground">
              {t("fields.phoneHint")}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <Label htmlFor={`${fieldId}-details`}>
          {t("fields.details")} <span aria-hidden="true">*</span>
        </Label>
        <Textarea
          id={`${fieldId}-details`}
          rows={6}
          className="min-h-36"
          aria-invalid={Boolean(errors.details)}
          aria-describedby={
            errors.details ? `${fieldId}-details-error` : `${fieldId}-details-hint`
          }
          placeholder={t("fields.detailsPlaceholder")}
          {...register("details")}
        />
        {errors.details ? (
          <p id={`${fieldId}-details-error`} className="text-xs text-destructive">
            {errors.details.message}
          </p>
        ) : (
          <p id={`${fieldId}-details-hint`} className="text-xs text-muted-foreground">
            {t("fields.detailsHint")}
          </p>
        )}
      </div>

      <div className="sr-only" aria-hidden="true">
        <label htmlFor={`${fieldId}-website`}>{t("fields.website")}</label>
        <input
          id={`${fieldId}-website`}
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      <div className="mt-7">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-foreground">{t("attachments.title")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t("attachments.description")}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("attachments.count", {
              count: attachments.length,
              max: MAX_PRINT_REQUEST_FILES,
            })}
          </p>
        </div>

        <div
          className={cn(
            "mt-3 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/25 px-4 py-8 text-center transition-colors",
            dragging && "border-primary bg-primary/5",
            (submitting || locked) && "opacity-70",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            if (!submitting && !locked) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            addFiles(event.dataTransfer.files);
          }}
          data-testid="print-request-dropzone"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-background text-primary-text shadow-soft">
            <UploadCloud className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">{t("attachments.dropTitle")}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("attachments.dropHint")}
            </p>
          </div>
          <input
            ref={fileInputRef}
            id={`${fieldId}-files`}
            type="file"
            multiple
            accept={PRINT_REQUEST_ACCEPT_ATTRIBUTE}
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) addFiles(event.target.files);
              event.target.value = "";
            }}
            disabled={submitting || locked}
            data-testid="print-request-file-input"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={submitting || locked}
          >
            <Paperclip aria-hidden="true" />
            {t("attachments.browse")}
          </Button>
          <p className="text-[0.7rem] leading-5 text-muted-foreground">
            {t("attachments.limits", {
              maxSize: formatBytes(MAX_PRINT_REQUEST_FILE_BYTES),
              totalSize: formatBytes(MAX_PRINT_REQUEST_TOTAL_BYTES),
            })}
          </p>
          <p className="text-[0.7rem] leading-5 text-muted-foreground">
            {t("attachments.extensions")}
          </p>
        </div>

        {attachments.length > 0 ? (
          <ul className="mt-4 space-y-2" data-testid="print-request-file-list">
            {attachments.map((attachment) => (
              <li
                key={attachment.key}
                className="rounded-xl border border-border bg-background/60 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <FileUp className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground" dir="auto">
                      {attachment.file.name}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span dir="ltr">{formatBytes(attachment.file.size)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="uppercase">
                        {fileExtension(attachment.file.name) || "file"}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={cn(
                          attachment.status === "error" && "text-destructive",
                          attachment.status === "uploaded" && "text-primary-text",
                        )}
                      >
                        {attachment.status === "uploading"
                          ? t("attachments.uploading", { progress: attachment.progress })
                          : attachment.status === "uploaded"
                            ? t("attachments.uploaded")
                            : attachment.status === "error"
                              ? t("attachments.failed")
                              : t("attachments.ready")}
                      </span>
                    </p>
                  </div>
                  {attachment.status === "error" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={retry}
                      disabled={submitting}
                      aria-label={t("attachments.retryFile", { name: attachment.file.name })}
                    >
                      <RotateCcw aria-hidden="true" />
                      {t("attachments.retry")}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => removeAttachment(attachment.key)}
                    disabled={submitting || locked}
                    aria-label={t("attachments.removeFile", { name: attachment.file.name })}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                {attachment.status === "uploading" || attachment.status === "uploaded" ? (
                  <div
                    className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={attachment.progress}
                    aria-label={t("attachments.fileProgress", {
                      name: attachment.file.name,
                    })}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-300"
                      style={{ width: `${attachment.progress}%` }}
                    />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {turnstileSiteKey ? (
        <div className="mt-6">
          <TurnstileWidget
            siteKey={turnstileSiteKey}
            locale={locale}
            onToken={setTurnstileToken}
            resetSignal={turnstileReset}
          />
        </div>
      ) : null}

      {submitError ? (
        <Alert variant="destructive" className="mt-6" data-testid="print-request-error">
          <AlertCircle aria-hidden="true" />
          <AlertTitle>{t("errors.title")}</AlertTitle>
          <AlertDescription>
            {t(submitError)}
            {submitError === "errors.rateLimited" && retryAfterSeconds ? (
              <> {t("errors.retryAfter", { seconds: retryAfterSeconds })}</>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {submitting || submitError ? (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{phaseLabel ?? t("progress.ready")}</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300",
                submitError ? "bg-destructive" : "bg-primary",
              )}
              style={{ width: `${Math.max(overallProgress, submitting ? 4 : 0)}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">
          {t("attachments.total", {
            size: formatBytes(totalBytes),
            total: formatBytes(MAX_PRINT_REQUEST_TOTAL_BYTES),
          })}
        </p>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {submitError || locked ? (
            <Button
              type="button"
              variant="outline"
              onClick={startOver}
              disabled={submitting}
            >
              {t("actions.startOver")}
            </Button>
          ) : null}
          {submitError && locked ? (
            <Button type="button" variant="outline" onClick={retry} disabled={submitting}>
              <RotateCcw aria-hidden="true" />
              {t("attachments.retrySubmission")}
            </Button>
          ) : null}
          <Button type="submit" disabled={submitting || attachments.length > MAX_PRINT_REQUEST_FILES}>
            {submitting ? (
              <>
                <Loader2 className="animate-spin" aria-hidden="true" />
                {t("actions.submitting")}
              </>
            ) : (
              <>
                <UploadCloud aria-hidden="true" />
                {t("actions.submit")}
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
