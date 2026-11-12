import type { ActivityEntry } from "@/domain/activity";

/** Demonstration activity feed. Product names mirror the seed catalog. */
export const seedActivity: ActivityEntry[] = [
  {
    id: "act-001",
    action: "product.updated",
    entityId: "prd-forge-x1",
    entityName: { en: "Tello Forge X1", ar: "تيلو فورج X1" },
    createdAt: "2026-11-10T07:45:00.000Z",
  },
  {
    id: "act-002",
    action: "product.featured",
    entityId: "prd-forge-pro-600",
    entityName: { en: "Tello Forge Pro 600", ar: "تيلو فورج برو 600" },
    createdAt: "2026-11-09T14:20:00.000Z",
  },
  {
    id: "act-003",
    action: "product.updated",
    entityId: "prd-uv-flatbed-2500",
    entityName: { en: "Tello UV Flatbed 2500", ar: "تيلو للطباعة المسطحة UV 2500" },
    createdAt: "2026-11-08T16:10:00.000Z",
  },
  {
    id: "act-004",
    action: "product.activated",
    entityId: "prd-uv-curing-station",
    entityName: { en: "UV Curing Station", ar: "محطة معالجة بالأشعة فوق البنفسجية" },
    createdAt: "2026-11-02T09:10:00.000Z",
  },
  {
    id: "act-005",
    action: "category.updated",
    entityId: "cat-materials",
    entityName: {
      en: "3D Printing Filaments and Materials",
      ar: "خيوط ومواد الطباعة ثلاثية الأبعاد",
    },
    createdAt: "2026-11-02T10:05:00.000Z",
  },
];
