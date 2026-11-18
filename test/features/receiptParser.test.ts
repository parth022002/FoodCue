import { describe, it, expect } from "vitest";
import { parseSupermarketReceiptText } from "../../src/domain/services/receiptParser";
import { appendPantryEvent, projectBalances } from "../../src/domain/services/pantryLedger";
import type { PantryEvent } from "../../src/domain/entities/pantry";

const MOCK_DMART_RECEIPT = `
AVENUE SUPERMARTS LIMITED - DMART KANDIVALI
GSTIN: 27AABCA1234D1Z2
TAX INVOICE NO: DM-2026/0491
DATE: 15/11/2026  TIME: 18:20

ITEM                    QTY   PRICE   TOTAL
-------------------------------------------
AMUL TAAZA TONED MILK 1L  2   56.00  112.00
TATA SALT 1KG             1   26.00   26.00
FORTUNE SUNFLOWER OIL 1L  1  138.00  138.00
FROZEN GREEN PEAS 500G    1   75.00   75.00
BRITANNIA BROWN BREAD     1   50.00   50.00
CARD: 4532-1234-5678-9012 AUTH: 89123
-------------------------------------------
NET PAYABLE:                         401.00
THANK YOU VISIT AGAIN
`;

describe("Phase 9: Receipt / Supermarket Bill OCR & Parser", () => {
  it("detects supermarket store name accurately", () => {
    const parsed = parseSupermarketReceiptText(MOCK_DMART_RECEIPT);
    expect(parsed.storeName).toBe("DMart (Avenue Supermarts)");
  });

  it("extracts purchase date accurately from DD/MM/YYYY format", () => {
    const parsed = parseSupermarketReceiptText(MOCK_DMART_RECEIPT);
    expect(parsed.purchaseDate).toBe("2026-11-15");
  });

  it("redacts sensitive payment card numbers for privacy protection", () => {
    const parsed = parseSupermarketReceiptText(MOCK_DMART_RECEIPT);
    expect(parsed.rawOcrText).not.toContain("4532-1234-5678-9012");
    expect(parsed.rawOcrText).toContain("[CARD REDACTED]");
  });

  it("extracts food items with quantities, units, and prices", () => {
    const parsed = parseSupermarketReceiptText(MOCK_DMART_RECEIPT);
    expect(parsed.items.length).toBeGreaterThanOrEqual(4);

    const milk = parsed.items.find((i) => i.name.toLowerCase().includes("milk"));
    expect(milk).toBeDefined();
    expect(milk!.quantity).toBe(2);
    expect(milk!.unit).toBe("L");
    expect(milk!.totalPrice).toBe(112.0);

    const salt = parsed.items.find((i) => i.name.toLowerCase().includes("salt"));
    expect(salt).toBeDefined();
    expect(salt!.unit).toBe("kg");
  });

  it("infers smart storage locations (Fridge, Freezer, Pantry)", () => {
    const parsed = parseSupermarketReceiptText(MOCK_DMART_RECEIPT);

    const milk = parsed.items.find((i) => i.name.toLowerCase().includes("milk"));
    expect(milk?.location).toBe("Fridge");

    const peas = parsed.items.find((i) => i.name.toLowerCase().includes("peas"));
    expect(peas?.location).toBe("Freezer");

    const salt = parsed.items.find((i) => i.name.toLowerCase().includes("salt"));
    expect(salt?.location).toBe("Pantry");
  });

  it("adds confirmed receipt items to the immutable pantry ledger", () => {
    const parsed = parseSupermarketReceiptText(MOCK_DMART_RECEIPT);
    let ledger: PantryEvent[] = [];

    for (const item of parsed.items) {
      const event: PantryEvent = {
        eventId: `evt_${item.id}`,
        itemId: item.name,
        eventType: "add",
        quantityDelta: item.quantity,
        unit: item.unit,
        location: item.location.toLowerCase() as "pantry" | "fridge" | "freezer",
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        confirmation: true, // explicit confirmation invariant
        dateType: "expiry",
        dateValue: item.expiryDate,
        source: "import",
        schemaVersion: 1
      };

      ledger = appendPantryEvent(event, ledger);
    }

    const balances = projectBalances(ledger);
    expect(balances.length).toBe(parsed.items.length);
    const milkBalance = balances.find((b) => b.itemId.toLowerCase().includes("milk"));
    expect(milkBalance?.quantity).toBe(2);
  });
});
