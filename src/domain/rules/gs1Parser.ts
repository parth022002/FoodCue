/**
 * FoodCue GS1 Syntax & Digital Link Parser (S2 Baseline)
 * Controlling Specification: Master Specification v13.5 §6.2 & GS1 General Specifications
 * Complies with 13 official GS1 conformance vectors (9 valid, 4 invalid).
 */

import { validateGtinCheckDigit } from "./gtin";

export interface Gs1ParsedCode {
  isValid: boolean;
  gtin?: string;
  batchOrLot?: string;
  productionDate?: string;     // YYYY-MM-DD
  bestBeforeDate?: string;     // YYYY-MM-DD
  sellByDate?: string;         // YYYY-MM-DD
  expirationDate?: string;     // YYYY-MM-DD
  serialNumber?: string;
  netWeightKg?: number;
  unsupportedAis: string[];
  rawPayload: string;
  syntaxType: "bracketed_element_string" | "gs_delimited_element_string" | "gs1_digital_link" | "unknown";
  errors: string[];
}

interface AiDefinition {
  ai: string;
  name: string;
  isFixed: boolean;
  length?: number;
  minLength?: number;
  maxLength?: number;
}

const KNOWN_AIS: Record<string, AiDefinition> = {
  "01": { ai: "01", name: "gtin", isFixed: true, length: 14 },
  "10": { ai: "10", name: "batch", isFixed: false, minLength: 1, maxLength: 20 },
  "11": { ai: "11", name: "production_date", isFixed: true, length: 6 },
  "15": { ai: "15", name: "best_before_date", isFixed: true, length: 6 },
  "16": { ai: "16", name: "sell_by_date", isFixed: true, length: 6 },
  "17": { ai: "17", name: "expiration_date", isFixed: true, length: 6 },
  "21": { ai: "21", name: "serial_number", isFixed: false, minLength: 1, maxLength: 20 },
  "3103": { ai: "3103", name: "net_weight_kg_3dec", isFixed: true, length: 6 }
};

/**
 * Parses GS1 date format YYMMDD to standard ISO YYYY-MM-DD.
 * Note: Day '00' in GS1 signifies the last calendar day of the given month.
 */
function parseGs1Date(yymmdd: string): string | null {
  if (!/^\d{6}$/.test(yymmdd)) return null;

  const rawYear = parseInt(yymmdd.substring(0, 2), 10);
  const rawMonth = parseInt(yymmdd.substring(2, 4), 10);
  let rawDay = parseInt(yymmdd.substring(4, 6), 10);

  if (rawMonth < 1 || rawMonth > 12) return null;

  // Pivot rule for 2-digit century: 51-99 is 1951-1999; 00-50 is 2000-2050
  const year = rawYear >= 51 ? 1900 + rawYear : 2000 + rawYear;

  // Day 00 convention: Last day of the month
  if (rawDay === 0) {
    const lastDayOfMonth = new Date(year, rawMonth, 0).getDate();
    rawDay = lastDayOfMonth;
  }

  if (rawDay < 1 || rawDay > 31) return null;

  const mm = rawMonth.toString().padStart(2, "0");
  const dd = rawDay.toString().padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/**
 * Parses a GS1 Digital Link URI
 * e.g. https://id.gs1.org/01/08901058852331/10/LOT123?17=261231
 */
function parseGs1DigitalLink(uri: string): Gs1ParsedCode {
  const result: Gs1ParsedCode = {
    isValid: false,
    rawPayload: uri,
    syntaxType: "gs1_digital_link",
    unsupportedAis: [],
    errors: []
  };

  try {
    const url = new URL(uri);
    const pathSegments = url.pathname.split("/").filter(Boolean);

    // Path pairs: /01/{gtin}/10/{batch}
    if (pathSegments.length < 2 || pathSegments.length % 2 !== 0) {
      result.errors.push("Invalid GS1 Digital Link path structure: must contain paired AI/Value segments.");
      return result;
    }

    for (let i = 0; i < pathSegments.length; i += 2) {
      const ai = pathSegments[i];
      const val = pathSegments[i + 1];
      if (!ai || !val) continue;

      if (ai === "01") {
        if (!/^\d{14}$/.test(val)) {
          result.errors.push(`AI (01) GTIN must be exactly 14 numeric digits, received: '${val}'.`);
        } else if (!validateGtinCheckDigit(val)) {
          result.errors.push(`AI (01) GTIN check-digit failure for '${val}'.`);
        } else {
          result.gtin = val;
        }
      } else if (ai === "10") {
        result.batchOrLot = decodeURIComponent(val);
      } else if (ai === "21") {
        result.serialNumber = decodeURIComponent(val);
      } else {
        result.unsupportedAis.push(ai);
      }
    }

    // Query parameters: ?17=261231&15=270630
    url.searchParams.forEach((val, key) => {
      if (key === "17") {
        const d = parseGs1Date(val);
        if (d) result.expirationDate = d;
        else result.errors.push(`Invalid date format for AI (17): '${val}'.`);
      } else if (key === "15") {
        const d = parseGs1Date(val);
        if (d) result.bestBeforeDate = d;
        else result.errors.push(`Invalid date format for AI (15): '${val}'.`);
      } else if (key === "11") {
        const d = parseGs1Date(val);
        if (d) result.productionDate = d;
        else result.errors.push(`Invalid date format for AI (11): '${val}'.`);
      } else if (key === "10") {
        result.batchOrLot = val;
      } else {
        result.unsupportedAis.push(key);
      }
    });

    result.isValid = result.errors.length === 0 && Boolean(result.gtin);
    return result;
  } catch (err) {
    result.errors.push(`Malformed URL for GS1 Digital Link: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }
}

/**
 * Parses bracketed GS1 Element String e.g. "(01)08901058852331(17)261231"
 */
function parseBracketedElement(payload: string): Gs1ParsedCode {
  const result: Gs1ParsedCode = {
    isValid: false,
    rawPayload: payload,
    syntaxType: "bracketed_element_string",
    unsupportedAis: [],
    errors: []
  };

  const aiRegex = /\((\d{2,4})\)([^(]+)/g;
  let match: RegExpExecArray | null;
  let matchesCount = 0;

  while ((match = aiRegex.exec(payload)) !== null) {
    matchesCount++;
    const ai = match[1];
    const val = match[2];
    if (!ai || !val) continue;

    applyAiValue(ai, val, result);
  }

  if (matchesCount === 0) {
    result.errors.push("No valid bracketed AIs found in payload.");
    return result;
  }

  result.isValid = result.errors.length === 0 && (Boolean(result.gtin) || Boolean(result.batchOrLot));
  return result;
}

/**
 * Parses element string delimited by ASCII 29 (<GS> / \u001d)
 */
function parseGsDelimited(payload: string): Gs1ParsedCode {
  const result: Gs1ParsedCode = {
    isValid: false,
    rawPayload: payload,
    syntaxType: "gs_delimited_element_string",
    unsupportedAis: [],
    errors: []
  };

  const FNC1 = "\u001d";
  const segments = payload.split(FNC1);

  for (let i = 0; i < segments.length; i++) {
    let seg = segments[i];
    if (!seg) continue;

    while (seg.length > 0) {
      let matched = false;

      // Try matching known fixed-length AIs first
      for (const [aiKey, def] of Object.entries(KNOWN_AIS)) {
        if (seg.startsWith(aiKey)) {
          matched = true;
          if (def.isFixed && def.length) {
            const totalLen = aiKey.length + def.length;
            if (seg.length < totalLen) {
              result.errors.push(`Truncated fixed-length AI (${aiKey}) in segment '${seg}'.`);
              seg = "";
              break;
            }
            const val = seg.substring(aiKey.length, totalLen);
            applyAiValue(aiKey, val, result);
            seg = seg.substring(totalLen);
            break;
          } else {
            // Variable length in this segment (take until end of segment or max length)
            const val = seg.substring(aiKey.length);
            applyAiValue(aiKey, val, result);
            seg = "";
            break;
          }
        }
      }

      if (!matched) {
        result.errors.push(`Encountered unknown or unsupported AI in GS-delimited string: '${seg}'.`);
        break;
      }
    }
  }

  result.isValid = result.errors.length === 0 && Boolean(result.gtin);
  return result;
}

function applyAiValue(ai: string, val: string, result: Gs1ParsedCode): void {
  const cleanVal = val.trim();
  const def = KNOWN_AIS[ai];

  if (!def) {
    result.unsupportedAis.push(ai);
    result.errors.push(`Unsupported AI (${ai}).`);
    return;
  }

  if (def.isFixed && def.length && cleanVal.length !== def.length) {
    result.errors.push(`AI (${ai}) expects ${def.length} characters, received ${cleanVal.length} ('${cleanVal}').`);
    return;
  }

  switch (ai) {
    case "01": {
      if (!validateGtinCheckDigit(cleanVal)) {
        result.errors.push(`AI (01) GTIN check-digit failure for '${cleanVal}'.`);
      } else {
        result.gtin = cleanVal;
      }
      break;
    }
    case "10": {
      result.batchOrLot = cleanVal;
      break;
    }
    case "11": {
      const d = parseGs1Date(cleanVal);
      if (d) result.productionDate = d;
      else result.errors.push(`Invalid production date for AI (11): '${cleanVal}'.`);
      break;
    }
    case "15": {
      const d = parseGs1Date(cleanVal);
      if (d) result.bestBeforeDate = d;
      else result.errors.push(`Invalid best-before date for AI (15): '${cleanVal}'.`);
      break;
    }
    case "16": {
      const d = parseGs1Date(cleanVal);
      if (d) result.sellByDate = d;
      else result.errors.push(`Invalid sell-by date for AI (16): '${cleanVal}'.`);
      break;
    }
    case "17": {
      const d = parseGs1Date(cleanVal);
      if (d) result.expirationDate = d;
      else result.errors.push(`Invalid expiration date for AI (17): '${cleanVal}'.`);
      break;
    }
    case "21": {
      result.serialNumber = cleanVal;
      break;
    }
    case "3103": {
      const grams = parseInt(cleanVal, 10);
      if (!isNaN(grams)) {
        result.netWeightKg = grams / 1000;
      }
      break;
    }
    default:
      result.unsupportedAis.push(ai);
  }
}

/**
 * Main GS1 Parser Entrypoint
 */
export function parseGs1Payload(payload: string): Gs1ParsedCode {
  const trimmed = payload.trim();

  // 1. GS1 Digital Link URI
  if (/^https?:\/\//i.test(trimmed)) {
    return parseGs1DigitalLink(trimmed);
  }

  // 2. Bracketed Element String: (01)...(10)...
  if (trimmed.startsWith("(") && trimmed.includes(")")) {
    return parseBracketedElement(trimmed);
  }

  // 3. Delimited Element String (FNC1 / ASCII 29 / pure digits)
  if (trimmed.includes("\u001d") || /^\d{2,}/.test(trimmed)) {
    return parseGsDelimited(trimmed);
  }

  return {
    isValid: false,
    rawPayload: payload,
    syntaxType: "unknown",
    unsupportedAis: [],
    errors: ["Payload does not match any recognized GS1 syntax."]
  };
}
