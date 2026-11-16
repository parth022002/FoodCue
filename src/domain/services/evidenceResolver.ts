/**
 * FoodCue Evidence Resolver Service (S2 Baseline)
 * Controlling Specification: Master Specification v13.5 §6.4 & Architecture Diagram
 *
 * Responsibilities:
 * - Records raw observations from multiple capture panels (Barcode, QR, GS1, OCR, Manual).
 * - Preserves immutable observation provenance (source, panel, detector, timestamp, confidence).
 * - Evaluates observational agreement and detects hard conflicts across modalities.
 * - Prevents silent conflation or averaging away of contradictory inputs.
 */

export type ObservationSource =
  | "barcode"
  | "qr"
  | "gs1"
  | "ocr_front"
  | "ocr_ingredients"
  | "ocr_allergens"
  | "ocr_nutrition"
  | "ocr_dates"
  | "manual";

export interface Observation {
  observationId: string;
  source: ObservationSource;
  timestamp: string; // ISO-8601
  rawPayload: string;
  confidence: number; // 0.0 to 1.0 calibrated
  detectorInfo?: {
    name: string;
    version?: string;
  };
  parsedFields: {
    gtin?: string;
    brand?: string;
    productName?: string;
    variant?: string;
    packSize?: string;
    fssaiLicense?: string;
    batchOrLot?: string;
    productionDate?: string;
    bestBeforeDate?: string;
    expirationDate?: string;
    allergens?: string[];
    ingredients?: string[];
    nutritionPer100g?: Record<string, number>;
  };
  warnings: string[];
}

export interface HardConflict {
  conflictId: string;
  field: string;
  severity: "hard" | "soft";
  observationA: {
    source: ObservationSource;
    value: string;
    timestamp: string;
  };
  observationB: {
    source: ObservationSource;
    value: string;
    timestamp: string;
  };
  explanation: string;
}

export interface ResolvedEvidenceState {
  observations: Observation[];
  conflicts: HardConflict[];
  hasHardConflicts: boolean;
  resolvedFields: {
    gtin?: string;
    brand?: string;
    productName?: string;
    variant?: string;
    packSize?: string;
    fssaiLicense?: string;
    batchOrLot?: string;
    productionDate?: string;
    bestBeforeDate?: string;
    expirationDate?: string;
    allergens: string[];
    ingredients: string[];
  };
  evidenceCoverage: number; // 0.0 to 1.0
  capturedPanels: string[];
}

export class EvidenceResolver {
  private observations: Observation[] = [];

  constructor(initialObservations: Observation[] = []) {
    this.observations = [...initialObservations];
  }

  /**
   * Adds an observation to the immutable provenance ledger.
   */
  addObservation(obs: Omit<Observation, "observationId" | "timestamp"> & { observationId?: string; timestamp?: string }): Observation {
    const fullObs: Observation = {
      observationId: obs.observationId || `obs-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: obs.timestamp || new Date().toISOString(),
      source: obs.source,
      rawPayload: obs.rawPayload,
      confidence: Math.min(1, Math.max(0, obs.confidence)),
      detectorInfo: obs.detectorInfo,
      parsedFields: { ...obs.parsedFields },
      warnings: [...(obs.warnings || [])],
    };

    this.observations.push(fullObs);
    return fullObs;
  }

  getObservations(): ReadonlyArray<Observation> {
    return Object.freeze([...this.observations]);
  }

  clear(): void {
    this.observations = [];
  }

  /**
   * Evaluates all stored observations to detect hard conflicts and synthesize the resolved state.
   */
  resolve(): ResolvedEvidenceState {
    const conflicts: HardConflict[] = [];
    const capturedPanelsSet = new Set<string>();

    // Track fields by source
    const fieldSources: Record<string, Array<{ source: ObservationSource; value: string; timestamp: string }>> = {
      gtin: [],
      brand: [],
      productName: [],
      packSize: [],
      fssaiLicense: [],
    };

    const resolvedAllergens = new Set<string>();
    const resolvedIngredients = new Set<string>();

    for (const obs of this.observations) {
      capturedPanelsSet.add(obs.source);

      if (obs.parsedFields.gtin) {
        fieldSources.gtin!.push({ source: obs.source, value: obs.parsedFields.gtin, timestamp: obs.timestamp });
      }
      if (obs.parsedFields.brand) {
        fieldSources.brand!.push({ source: obs.source, value: obs.parsedFields.brand, timestamp: obs.timestamp });
      }
      if (obs.parsedFields.productName) {
        fieldSources.productName!.push({ source: obs.source, value: obs.parsedFields.productName, timestamp: obs.timestamp });
      }
      if (obs.parsedFields.packSize) {
        fieldSources.packSize!.push({ source: obs.source, value: obs.parsedFields.packSize, timestamp: obs.timestamp });
      }
      if (obs.parsedFields.fssaiLicense) {
        fieldSources.fssaiLicense!.push({ source: obs.source, value: obs.parsedFields.fssaiLicense, timestamp: obs.timestamp });
      }

      if (obs.parsedFields.allergens) {
        obs.parsedFields.allergens.forEach((a) => resolvedAllergens.add(a));
      }
      if (obs.parsedFields.ingredients) {
        obs.parsedFields.ingredients.forEach((i) => resolvedIngredients.add(i));
      }
    }

    // Detect Hard Conflicts across modalities
    // 1. GTIN conflict: e.g. barcode reading GTIN-A while GS1 Digital Link reads GTIN-B
    if (fieldSources.gtin!.length > 1) {
      const first = fieldSources.gtin![0]!;
      for (let i = 1; i < fieldSources.gtin!.length; i++) {
        const other = fieldSources.gtin![i]!;
        if (first.value !== other.value) {
          conflicts.push({
            conflictId: `conflict-gtin-${Date.now()}-${i}`,
            field: "gtin",
            severity: "hard",
            observationA: first,
            observationB: other,
            explanation: `Incompatible GTIN readings between ${first.source} ('${first.value}') and ${other.source} ('${other.value}').`,
          });
        }
      }
    }

    // 2. FSSAI License conflict
    if (fieldSources.fssaiLicense!.length > 1) {
      const first = fieldSources.fssaiLicense![0]!;
      for (let i = 1; i < fieldSources.fssaiLicense!.length; i++) {
        const other = fieldSources.fssaiLicense![i]!;
        if (first.value !== other.value) {
          conflicts.push({
            conflictId: `conflict-fssai-${Date.now()}-${i}`,
            field: "fssaiLicense",
            severity: "hard",
            observationA: first,
            observationB: other,
            explanation: `Contradictory FSSAI license numbers between ${first.source} ('${first.value}') and ${other.source} ('${other.value}').`,
          });
        }
      }
    }

    // 3. Brand conflict (case-insensitive substring/normalized comparison)
    if (fieldSources.brand!.length > 1) {
      const first = fieldSources.brand![0]!;
      const normFirst = first.value.toLowerCase().replace(/[^a-z0-9]/g, "");
      for (let i = 1; i < fieldSources.brand!.length; i++) {
        const other = fieldSources.brand![i]!;
        const normOther = other.value.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!normFirst.includes(normOther) && !normOther.includes(normFirst)) {
          conflicts.push({
            conflictId: `conflict-brand-${Date.now()}-${i}`,
            field: "brand",
            severity: "hard",
            observationA: first,
            observationB: other,
            explanation: `Brand contradiction between ${first.source} ('${first.value}') and ${other.source} ('${other.value}').`,
          });
        }
      }
    }

    // Compute Evidence Coverage: ratio of 7 critical target fields captured
    let presentFieldCount = 0;
    const targetFields = ["gtin", "brand", "productName", "packSize", "fssaiLicense", "allergens", "ingredients"];

    if (fieldSources.gtin!.length > 0) presentFieldCount++;
    if (fieldSources.brand!.length > 0) presentFieldCount++;
    if (fieldSources.productName!.length > 0) presentFieldCount++;
    if (fieldSources.packSize!.length > 0) presentFieldCount++;
    if (fieldSources.fssaiLicense!.length > 0) presentFieldCount++;
    if (resolvedAllergens.size > 0) presentFieldCount++;
    if (resolvedIngredients.size > 0) presentFieldCount++;

    const evidenceCoverage = Math.round((presentFieldCount / targetFields.length) * 100) / 100;
    const hasHardConflicts = conflicts.some((c) => c.severity === "hard");

    // Synthesize latest agreed values
    const latestGtin = fieldSources.gtin!.at(-1)?.value;
    const latestBrand = fieldSources.brand!.at(-1)?.value;
    const latestProductName = fieldSources.productName!.at(-1)?.value;
    const latestPackSize = fieldSources.packSize!.at(-1)?.value;
    const latestFssai = fieldSources.fssaiLicense!.at(-1)?.value;

    // Find date fields from latest observation containing them
    let batchOrLot: string | undefined;
    let productionDate: string | undefined;
    let bestBeforeDate: string | undefined;
    let expirationDate: string | undefined;

    for (const obs of this.observations) {
      if (obs.parsedFields.batchOrLot) batchOrLot = obs.parsedFields.batchOrLot;
      if (obs.parsedFields.productionDate) productionDate = obs.parsedFields.productionDate;
      if (obs.parsedFields.bestBeforeDate) bestBeforeDate = obs.parsedFields.bestBeforeDate;
      if (obs.parsedFields.expirationDate) expirationDate = obs.parsedFields.expirationDate;
    }

    return {
      observations: [...this.observations],
      conflicts,
      hasHardConflicts,
      resolvedFields: {
        gtin: latestGtin,
        brand: latestBrand,
        productName: latestProductName,
        packSize: latestPackSize,
        fssaiLicense: latestFssai,
        batchOrLot,
        productionDate,
        bestBeforeDate,
        expirationDate,
        allergens: Array.from(resolvedAllergens),
        ingredients: Array.from(resolvedIngredients),
      },
      evidenceCoverage,
      capturedPanels: Array.from(capturedPanelsSet),
    };
  }
}
