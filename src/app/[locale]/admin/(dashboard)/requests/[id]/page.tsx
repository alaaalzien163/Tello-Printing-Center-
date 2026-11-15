import { notFound, redirect } from "next/navigation";

import { RequestDetail } from "@/components/admin/requests/request-detail";
import type { Locale } from "@/i18n/routing";
import {
  getPrintRequestDetailData,
  markPrintRequestReadData,
} from "@/lib/print-requests/admin";

interface AdminRequestDetailPageProps {
  params: Promise<{ locale: Locale; id: string }>;
}

export default async function AdminRequestDetailPage({
  params,
}: AdminRequestDetailPageProps) {
  const { locale, id } = await params;
  const result = await getPrintRequestDetailData(id);

  if (!result.ok) {
    if (result.error === "UNAUTHORIZED") redirect(`/${locale}/admin/login`);
    notFound();
  }

  if (!result.data.isRead) {
    await markPrintRequestReadData(id).catch(() => undefined);
  }

  return <RequestDetail request={{ ...result.data, isRead: true }} />;
}
