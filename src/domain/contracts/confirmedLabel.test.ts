import { describe, expect, it } from "vitest";
import { createConfirmedLabel, ConfirmationError, isConfirmedLabel } from "./confirmedLabel";
import type { ProductCandidate } from "../entities/food";

const candidate: ProductCandidate = {
  candidateId: "candidate-1", identifier: "4006381333931", identifierType: "gtin",
  displayName: "GTIN candidate", status: "candidate", provenance: ["manual"],
  observedAt: new Date().toISOString(), conflicts: []
};

describe("ConfirmedLabel boundary", () => {
  it("creates a label only when identity, version and panels are confirmed", () => {
    const label = createConfirmedLabel({
      candidate, physicalIdentity: "Sample pack", labelVersion: "Version A",
      panels: ["ingredients", "allergen_declaration", "nutrition"],
      fieldStates: { physical_identity: "confirmed", ingredients_panel: "confirmed", allergen_declaration_panel: "confirmed", nutrition_panel: "confirmed" },
      evidenceReferences: ["local-test"]
    });
    expect(isConfirmedLabel(label)).toBe(true);
  });
  it("blocks missing or unreadable critical fields", () => {
    expect(() => createConfirmedLabel({
      candidate, physicalIdentity: "Sample pack", labelVersion: "Version A",
      panels: ["ingredients", "allergen_declaration", "nutrition"], fieldStates: { physical_identity: "confirmed", ingredients_panel: "unreadable", allergen_declaration_panel: "confirmed", nutrition_panel: "confirmed" }, evidenceReferences: []
    })).toThrow(ConfirmationError);
  });
  it("blocks hard identity conflicts", () => {
    expect(() => createConfirmedLabel({
      candidate: { ...candidate, conflicts: ["pack size mismatch"] },
      physicalIdentity: "Sample pack", labelVersion: "Version A",
      panels: ["ingredients", "allergen_declaration", "nutrition"], fieldStates: { physical_identity: "confirmed", ingredients_panel: "confirmed", allergen_declaration_panel: "confirmed", nutrition_panel: "confirmed" }, evidenceReferences: []
    })).toThrow(ConfirmationError);
  });
});
