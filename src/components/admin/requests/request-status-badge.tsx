"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import type { PrintRequestStatus } from "@/domain/print-request";
import { cn } from "@/lib/utils";

const STATUS_CLASSES: Record<PrintRequestStatus, string> = {
  uploading: "border-warning/30 bg-warning/10 text-warning",
  pending: "border-primary/30 bg-primary/10 text-primary-text",
  reviewing: "border-brand-secondary/35 bg-brand-secondary/12 text-primary-text",
  quoted: "border-brand-active/40 bg-brand-active/12 text-primary-text",
  approved: "border-success/30 bg-success/10 text-success",
  completed: "border-success/35 bg-success/15 text-success",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  cancelled: "border-border bg-muted text-muted-foreground",
};

export function PrintRequestStatusBadge({
  status,
  className,
}: {
  status: PrintRequestStatus;
  className?: string;
}) {
  const t = useTranslations("admin.requests.statuses");

  return (
    <Badge variant="outline" className={cn(STATUS_CLASSES[status], className)}>
      {t(status)}
    </Badge>
  );
}
