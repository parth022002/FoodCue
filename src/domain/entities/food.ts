export type EvidenceState =
  | "confirmed"
  | "candidate"
  | "uncertain"
  | "not_assessed"
  | "not_detected_in_extracted_text"
  | "unsupported";

export type CaptureMode = "camera" | "photo" | "gallery" | "manual";

export interface CaptureRecord {
  captureId: string;
  capturedAt: string;
  inputMode: CaptureMode;
  mediaType: string;
  rawPayload?: string;
  symbology?: string;
  detectorName?: string;
  detectorVersion?: string;
  confidence?: number;
  warnings: string[];
}

export interface ProductCandidate {
  candidateId: string;
  identifier?: string;
  identifierType: "gtin" | "text" | "unknown";
  displayName: string;
  status: "candidate" | "uncertain" | "unsupported";
  provenance: string[];
  observedAt: string;
  conflicts: string[];
}

export interface ConfirmedLabel {
  schemaVersion: 1;
  confirmedLabelId: string;
  candidateId: string;
  confirmedPhysicalIdentity: string;
  labelVersion: string;
  panels: string[];
  fieldConfirmationStates: Record<string, "confirmed" | "unreadable" | "missing">;
  evidenceReferences: string[];
  sourceReferences: string[];
  confirmedAt: string;
  confirmationMethod: "user_physical_pack_review";
}

export interface FoodAnalysisResult {
  resultId: string;
  confirmedLabelId: string;
  state: "not_assessed" | "reviewed";
  ingredientObservations: string[];
  allergenResults: Array<{ term: string; state: EvidenceState; explanation: string }>;
  nutritionValues: Array<{ nutrient: string; value: number; unit: string; basis: string }>;
  dataCompleteness: "incomplete" | "complete";
  uncertaintyReasons: string[];
  sourceReferences: string[];
  ruleVersion: string;
  contentVersion: string;
  analysedAt: string;
}
