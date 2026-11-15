"use server";

import type {
  AdminPrintRequestStatus,
  PrintRequestFilters,
} from "@/domain/print-request";

import {
  deletePrintRequestData,
  getPrintRequestDetailData,
  getPrintRequestStatsData,
  getUnreadPrintRequestCountData,
  listPrintRequestsData,
  markPrintRequestReadData,
  updatePrintRequestNotesData,
  updatePrintRequestStatusData,
} from "@/lib/print-requests/admin";

/** Admin-only read used by the requests table, filters and pagination. */
export async function listPrintRequests(filters: PrintRequestFilters) {
  return listPrintRequestsData(filters);
}

export async function getPrintRequestStats() {
  return getPrintRequestStatsData();
}

export async function getUnreadPrintRequestCount() {
  return getUnreadPrintRequestCountData();
}

export async function getPrintRequestDetail(id: string) {
  return getPrintRequestDetailData(id);
}

export async function markPrintRequestRead(id: string) {
  return markPrintRequestReadData(id);
}

export async function updatePrintRequestStatus(
  id: string,
  status: AdminPrintRequestStatus,
) {
  return updatePrintRequestStatusData(id, status);
}

export async function updatePrintRequestNotes(id: string, notes: string) {
  return updatePrintRequestNotesData(id, notes);
}

export async function deletePrintRequest(id: string) {
  return deletePrintRequestData(id);
}
