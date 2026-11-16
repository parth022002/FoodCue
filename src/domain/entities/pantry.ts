export type PantryEventType = "add" | "consume" | "adjust" | "move" | "discard" | "correction" | "import";

export type PantryLocation = "pantry" | "fridge" | "freezer" | "use_soon";

export type PantryDateType = "best_before" | "use_by" | "expiry" | "date_of_mfg";

export interface PantryEvent {
  eventId: string;
  itemId: string;
  eventType: PantryEventType;
  quantityDelta: number;
  unit: string;
  location?: PantryLocation;
  dateType?: PantryDateType;
  dateValue?: string;
  occurredAt: string;
  createdAt: string;
  source: "manual" | "confirmed_label" | "import";
  confirmation: true;
  note?: string;
  schemaVersion: 1;
}

export interface PantryBalance {
  itemId: string;
  quantity: number;
  unit: string;
}

export interface PantryItem {
  itemId: string;
  productName: string;
  brand?: string;
  currentQuantity: number;
  unit: string;
  location: PantryLocation;
  storageCondition?: "ambient" | "refrigerated" | "frozen" | "cool_dry";
  dateType?: PantryDateType;
  dateValue?: string;
  openedAt?: string;
  status: "active" | "depleted" | "discarded";
  updatedAt?: string;
}
