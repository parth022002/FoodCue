import type { ConfirmedLabel, ProductCandidate } from "../entities/food";

export class ConfirmationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfirmationError";
  }
}

/**
 * Constructs the only contract accepted by food-intelligence.
 * This function represents a user's explicit physical-pack review.
 * It does not verify that the pack itself is truthful or authentic.
 */
export function createConfirmedLabel(input: {
  candidate: ProductCandidate;
  physicalIdentity: string;
  labelVersion: string;
  panels: string[];
  fieldStates: Record<string, "confirmed" | "unreadable" | "missing">;
  evidenceReferences: string[];
}): ConfirmedLabel {
  const { candidate, physicalIdentity, labelVersion, panels, fieldStates, evidenceReferences } = input;

  if (candidate.status !== "candidate") {
    throw new ConfirmationError("Only a supported candidate can proceed to physical-pack confirmation.");
  }
  if (candidate.conflicts.length > 0) {
    throw new ConfirmationError("Resolve product identity conflicts before confirmation.");
  }
  if (!physicalIdentity.trim() || !labelVersion.trim()) {
    throw new ConfirmationError("Physical identity and label version are required.");
  }
  const requiredPanels = ["ingredients", "allergen_declaration", "nutrition"];
  const requiredFields = ["physical_identity", "ingredients_panel", "allergen_declaration_panel", "nutrition_panel"];
  if (!requiredPanels.every((panel) => panels.includes(panel))
      || !requiredFields.every((field) => fieldStates[field] === "confirmed")) {
    throw new ConfirmationError("Required critical label panels and field confirmations are incomplete.");
  }
  if (Object.values(fieldStates).some((state) => state !== "confirmed")) {
    throw new ConfirmationError("Unreadable or missing critical fields block food-safety analysis.");
  }

  return {
    schemaVersion: 1,
    confirmedLabelId: crypto.randomUUID(),
    candidateId: candidate.candidateId,
    confirmedPhysicalIdentity: physicalIdentity.trim(),
    labelVersion: labelVersion.trim(),
    panels: [...new Set(panels)],
    fieldConfirmationStates: { ...fieldStates },
    evidenceReferences: [...evidenceReferences],
    sourceReferences: [...candidate.provenance],
    confirmedAt: new Date().toISOString(),
    confirmationMethod: "user_physical_pack_review"
  };
}

export function isConfirmedLabel(value: unknown): value is ConfirmedLabel {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<ConfirmedLabel>;
  return item.schemaVersion === 1
    && typeof item.confirmedLabelId === "string"
    && typeof item.candidateId === "string"
    && typeof item.confirmedPhysicalIdentity === "string"
    && item.confirmedPhysicalIdentity.length > 0
    && typeof item.labelVersion === "string"
    && item.labelVersion.length > 0
    && Array.isArray(item.panels)
    && ["ingredients", "allergen_declaration", "nutrition"].every((panel) => item.panels?.includes(panel))
    && !!item.fieldConfirmationStates
    && ["physical_identity", "ingredients_panel", "allergen_declaration_panel", "nutrition_panel"]
      .every((field) => item.fieldConfirmationStates?.[field] === "confirmed")
    && Object.values(item.fieldConfirmationStates).every((state) => state === "confirmed");
}
