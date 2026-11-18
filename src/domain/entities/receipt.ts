export interface ReceiptLineItem {
  id: string;
  name: string;
  rawText?: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
  location: "Pantry" | "Fridge" | "Freezer";
  shelfLifeDays: number;
  expiryDate: string; // ISO date string YYYY-MM-DD
}

export interface ParsedReceipt {
  storeName: string;
  purchaseDate: string;
  receiptNumber?: string;
  items: ReceiptLineItem[];
  subtotal?: number;
  tax?: number;
  grandTotal?: number;
  currency: string;
  rawOcrText: string;
}
