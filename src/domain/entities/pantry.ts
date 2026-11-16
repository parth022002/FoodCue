export type PantryEventType = "add" | "consume" | "adjust" | "move" | "discard" | "correction" | "import";

export interface PantryEvent {
  eventId: string;
  itemId: string;
  eventType: PantryEventType;
  quantityDelta: number;
  unit: string;
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
