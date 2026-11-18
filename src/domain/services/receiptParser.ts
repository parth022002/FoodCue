import type { ParsedReceipt, ReceiptLineItem } from "../entities/receipt";

function sanitizeOcrText(text: string): string {
  // Strip sensitive credit card / debit card numbers (e.g. 4XXX XXXX XXXX 1234)
  let clean = text.replace(/\b(?:\d[ -]*?){13,16}\b/g, "[CARD REDACTED]");
  // Strip UPI transaction references
  clean = clean.replace(/UPI\s*(?:Ref|Txn|ID)?[:\s]+[a-zA-Z0-9_-]+/gi, "UPI Ref: [REDACTED]");
  return clean;
}

function inferCategoryAndStorage(name: string): {
  location: "Pantry" | "Fridge" | "Freezer";
  shelfLifeDays: number;
} {
  const lower = name.toLowerCase();

  // Frozen foods -> Freezer
  if (lower.includes("frozen") || lower.includes("ice cream") || lower.includes("kulfi")) {
    return { location: "Freezer", shelfLifeDays: 90 };
  }

  // Dairy & Perishables -> Fridge
  if (
    lower.includes("milk") ||
    lower.includes("paneer") ||
    lower.includes("curd") ||
    lower.includes("dahi") ||
    lower.includes("butter") ||
    lower.includes("cheese") ||
    lower.includes("yogurt") ||
    lower.includes("tofu") ||
    lower.includes("meat") ||
    lower.includes("chicken") ||
    lower.includes("fish") ||
    lower.includes("egg")
  ) {
    return { location: "Fridge", shelfLifeDays: 5 };
  }

  // Bakery -> Pantry (short shelf life)
  if (lower.includes("bread") || lower.includes("pav") || lower.includes("bun") || lower.includes("roti")) {
    return { location: "Pantry", shelfLifeDays: 4 };
  }

  // Fresh produce -> Fridge
  if (
    lower.includes("tomato") ||
    lower.includes("cucumber") ||
    lower.includes("coriander") ||
    lower.includes("spinach") ||
    lower.includes("palak") ||
    lower.includes("methi") ||
    lower.includes("apple") ||
    lower.includes("berry")
  ) {
    return { location: "Fridge", shelfLifeDays: 6 };
  }

  // Default Pantry Staples (Dal, Atta, Rice, Oil, Spices, Biscuits, Cereal, Pasta, Noodles, Sugar, Salt)
  return { location: "Pantry", shelfLifeDays: 180 };
}

function calculateExpiryDate(shelfLifeDays: number): string {
  const d = new Date(Date.now() + shelfLifeDays * 86400000);
  return d.toISOString().split("T")[0] ?? "";
}

export function parseSupermarketReceiptText(rawOcrText: string): ParsedReceipt {
  const sanitizedText = sanitizeOcrText(rawOcrText);
  const lines = sanitizedText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let storeName = "Supermarket Grocery Store";
  let purchaseDate = new Date().toISOString().split("T")[0] ?? "";
  let receiptNumber: string | undefined;
  let grandTotal: number | undefined;

  // 1. Detect Store Name
  const knownStores: Array<{ pattern: RegExp; name: string }> = [
    { pattern: /reliance\s*(?:retail|fresh|smart|digital)/i, name: "Reliance Smart & Fresh" },
    { pattern: /(?:dmart|avenue\s*supermarts)/i, name: "DMart (Avenue Supermarts)" },
    { pattern: /bigbasket|innovative\s*retail/i, name: "BigBasket" },
    { pattern: /nature'?s\s*basket/i, name: "Nature's Basket" },
    { pattern: /more\s*(?:retail|supermarket|hypermarket)/i, name: "More Retail" },
    { pattern: /spencer'?s/i, name: "Spencer's Retail" },
    { pattern: /star\s*(?:bazaar|market)/i, name: "Star Bazaar" },
    { pattern: /blinkit|grofers/i, name: "Blinkit" },
    { pattern: /zepto/i, name: "Zepto" },
    { pattern: /swiggy\s*instamart/i, name: "Swiggy Instamart" }
  ];

  for (const line of lines.slice(0, 10)) {
    for (const store of knownStores) {
      if (store.pattern.test(line)) {
        storeName = store.name;
        break;
      }
    }
    if (storeName !== "Supermarket Grocery Store") break;
  }

  // 2. Detect Purchase Date
  const datePatterns = [
    /(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/, // DD/MM/YYYY
    /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/  // YYYY-MM-DD
  ];

  for (const line of lines) {
    for (const pat of datePatterns) {
      const match = line.match(pat);
      if (match && match[1] && match[2] && match[3]) {
        if (match[3].length === 4) {
          // DD/MM/YYYY -> YYYY-MM-DD
          const day = match[1].padStart(2, "0");
          const month = match[2].padStart(2, "0");
          const year = match[3];
          purchaseDate = `${year}-${month}-${day}`;
        } else if (match[1].length === 4) {
          // YYYY-MM-DD
          purchaseDate = `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
        }
        break;
      }
    }
  }

  // 3. Detect Bill / Invoice Number
  const billPattern = /(?:bill|inv(?:oice)?|receipt|txn)[\s#:]*([a-zA-Z0-9\-_/]+)/i;
  for (const line of lines) {
    const match = line.match(billPattern);
    if (match && match[1] && match[1].length > 2) {
      receiptNumber = match[1];
      break;
    }
  }

  // 4. Detect Grand Total
  const totalPattern = /(?:grand\s*total|net\s*amount|total\s*amount|total|payable)[\s:₹Rs.]*(\d+(?:\.\d{1,2})?)/i;
  for (const line of lines) {
    const match = line.match(totalPattern);
    if (match && match[1]) {
      const parsed = parseFloat(match[1]);
      if (!isNaN(parsed) && parsed > 0) {
        grandTotal = parsed;
      }
    }
  }

  // 5. Parse Item Lines
  // Formats common in Indian bills:
  // "1 AMUL TAAZA 1L 1 58.00 58.00"
  // "AASHIRVAAD ATTA 5KG   345.00"
  // "TATA SALT 1KG   28.00"
  // "FORTUNE SUNFLOWER OIL 1L  140.00"
  const items: ReceiptLineItem[] = [];
  const nonItemKeywords = [
    "total", "subtotal", "tax", "gst", "cgst", "sgst", "cash", "change",
    "card", "discount", "savings", "invoice", "terminal", "welcome", "thank",
    "phone", "fssai", "cin", "gstin", "date", "time", "counter"
  ];

  let itemCounter = 1;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (nonItemKeywords.some((kw) => lower.includes(kw))) {
      continue;
    }

    // Pattern A: [DESC] [QTY] [UNIT_PRICE] [TOTAL_PRICE]
    // e.g. "AMUL TAAZA TONED MILK 1L  2   56.00  112.00"
    const threeNumsMatch = line.match(/^(.+?)\s+(\d{1,3})\s+(\d+(?:\.\d{1,2})?)\s+(\d+(?:\.\d{1,2})?)\s*$/);
    // Pattern B: [DESC] [QTY] [TOTAL_PRICE]
    // e.g. "AMUL TAAZA 1L  2   112.00"
    const twoNumsMatch = !threeNumsMatch && line.match(/^(.+?)\s+(\d{1,3})\s+(\d+(?:\.\d{1,2})?)\s*$/);
    // Pattern C: [DESC] [TOTAL_PRICE]
    // e.g. "TATA SALT 1KG  26.00"
    const oneNumMatch = !threeNumsMatch && !twoNumsMatch && line.match(/^(.+?)\s+(?:(?:Rs\.?|₹)\s*)?(\d{1,5}(?:\.\d{1,2})?)\s*$/);

    if (threeNumsMatch && threeNumsMatch[1] && threeNumsMatch[2] && threeNumsMatch[3] && threeNumsMatch[4]) {
      let desc = threeNumsMatch[1].trim();
      const qty = parseInt(threeNumsMatch[2], 10) || 1;
      const unitPrice = parseFloat(threeNumsMatch[3]);
      const totalPrice = parseFloat(threeNumsMatch[4]);

      desc = desc.replace(/^[\d\s.\-_]+/, "").trim();
      let unit = "pack";
      if (/(?:\b|\d)(?:kg|kilo)(?:\b|$)/i.test(desc)) unit = "kg";
      else if (/(?:\b|\d)(?:g|gm|grams)(?:\b|$)/i.test(desc)) unit = "g";
      else if (/(?:\b|\d)(?:l|litre|liter)(?:\b|$)/i.test(desc)) unit = "L";
      else if (/(?:\b|\d)(?:ml)(?:\b|$)/i.test(desc)) unit = "ml";
      else if (/(?:\b|\d)(?:pcs|nos)(?:\b|$)/i.test(desc)) unit = "pcs";

      if (desc.length >= 2 && !/^[0-9\s.,-]+$/.test(desc)) {
        const storage = inferCategoryAndStorage(desc);
        items.push({
          id: `receipt_item_${itemCounter++}`,
          name: desc,
          rawText: line,
          quantity: qty,
          unit,
          unitPrice,
          totalPrice,
          location: storage.location,
          shelfLifeDays: storage.shelfLifeDays,
          expiryDate: calculateExpiryDate(storage.shelfLifeDays)
        });
      }
    } else if (twoNumsMatch && twoNumsMatch[1] && twoNumsMatch[2] && twoNumsMatch[3]) {
      let desc = twoNumsMatch[1].trim();
      const qty = parseInt(twoNumsMatch[2], 10) || 1;
      const totalPrice = parseFloat(twoNumsMatch[3]);

      desc = desc.replace(/^[\d\s.\-_]+/, "").trim();
      let unit = "pack";
      if (/(?:\b|\d)(?:kg|kilo)(?:\b|$)/i.test(desc)) unit = "kg";
      else if (/(?:\b|\d)(?:g|gm|grams)(?:\b|$)/i.test(desc)) unit = "g";
      else if (/(?:\b|\d)(?:l|litre|liter)(?:\b|$)/i.test(desc)) unit = "L";
      else if (/(?:\b|\d)(?:ml)(?:\b|$)/i.test(desc)) unit = "ml";
      else if (/(?:\b|\d)(?:pcs|nos)(?:\b|$)/i.test(desc)) unit = "pcs";

      if (desc.length >= 2 && !/^[0-9\s.,-]+$/.test(desc)) {
        const storage = inferCategoryAndStorage(desc);
        items.push({
          id: `receipt_item_${itemCounter++}`,
          name: desc,
          rawText: line,
          quantity: qty,
          unit,
          unitPrice: totalPrice / qty,
          totalPrice,
          location: storage.location,
          shelfLifeDays: storage.shelfLifeDays,
          expiryDate: calculateExpiryDate(storage.shelfLifeDays)
        });
      }
    } else if (oneNumMatch && oneNumMatch[1] && oneNumMatch[2]) {
      let desc = oneNumMatch[1].trim();
      const rawPrice = parseFloat(oneNumMatch[2]);
      if (rawPrice > 0 && rawPrice < 50000) {
        const qty = 1;
        let unit = "pack";

        desc = desc.replace(/^[\d\s.\-_]+/, "").trim();
        if (/(?:\b|\d)(?:kg|kilo)(?:\b|$)/i.test(desc)) unit = "kg";
        else if (/(?:\b|\d)(?:g|gm|grams)(?:\b|$)/i.test(desc)) unit = "g";
        else if (/(?:\b|\d)(?:l|litre|liter)(?:\b|$)/i.test(desc)) unit = "L";
        else if (/(?:\b|\d)(?:ml)(?:\b|$)/i.test(desc)) unit = "ml";
        else if (/(?:\b|\d)(?:pcs|nos)(?:\b|$)/i.test(desc)) unit = "pcs";

        if (desc.length >= 2 && !/^[0-9\s.,-]+$/.test(desc)) {
          const storage = inferCategoryAndStorage(desc);
          items.push({
            id: `receipt_item_${itemCounter++}`,
            name: desc,
            rawText: line,
            quantity: qty,
            unit,
            unitPrice: rawPrice,
            totalPrice: rawPrice,
            location: storage.location,
            shelfLifeDays: storage.shelfLifeDays,
            expiryDate: calculateExpiryDate(storage.shelfLifeDays)
          });
        }
      }
    }
  }

  return {
    storeName,
    purchaseDate,
    receiptNumber,
    items,
    grandTotal: grandTotal || items.reduce((acc, i) => acc + (i.totalPrice || 0), 0),
    currency: "INR",
    rawOcrText: sanitizedText
  };
}
