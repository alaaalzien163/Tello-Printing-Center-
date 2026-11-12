import type { LocalizedText } from "./common";

export type ActivityAction =
  | "product.created"
  | "product.updated"
  | "product.deleted"
  | "product.activated"
  | "product.deactivated"
  | "product.featured"
  | "product.unfeatured"
  | "category.created"
  | "category.updated"
  | "category.deleted";

export interface ActivityEntry {
  id: string;
  action: ActivityAction;
  entityId: string;
  entityName: LocalizedText;
  createdAt: string;
}
