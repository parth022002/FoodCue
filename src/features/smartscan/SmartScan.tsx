import React, { useState, useRef, useEffect } from "react";
import { normaliseGtin } from "../../domain/rules/gtin";
import { classifyPayload, type PayloadClass } from "../../domain/rules/payloadClassifier";
import { parseGs1Payload } from "../../domain/rules/gs1Parser";
import type { ProductCandidate, ConfirmedLabel } from "../../domain/entities/food";
import { createConfirmedLabel } from "../../domain/contracts/confirmedLabel";
import {
  evaluateConfirmedFoodLabel,
  type DetailedFoodAnalysis
} from "../../domain/rules/foodIntelligenceEngine";
import {
  decodeBarcodeFromFile,
  decodeBarcodeFromImageData
} from "../../adapters/barcode/barcodeService";
import {
  VERIFIED_INDIAN_CATALOG,
  type VerifiedFoodProduct
} from "../../domain/entities/catalogData";
import { LocalOcrAdapter } from "../../adapters/ocr/localOcrAdapter";
import {
  EvidenceResolver,
  type Observation,
  type ResolvedEvidenceState
} from "../../domain/services/evidenceResolver";
import {
  rankCandidates,
  validateConfirmedLabelGate,
  type RankedCandidate
} from "../../domain/services/candidateMatcher";
import { requestCameraStream, stopCameraStream } from "../../adapters/camera/camera";
import { putRecord } from "../../adapters/storage/database";
import type { PantryEvent } from "../../domain/entities/pantry";
import {
  Camera,
  Upload,
  Keyboard,
  Sparkles,
  CheckCircle2,
  ShieldAlert,
  PhoneCall,
  Plus,
  RefreshCw,
  Flashlight,
  SwitchCamera,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
  X
} from "lucide-react";

export function SmartScan({
  initialGtin,
  onAddedToKitchen
}: {
  initialGtin?: string;
  onAddedToKitchen?: () => void;
}) {
  const [activeMode, setActiveMode] = useState<"camera" | "upload" | "manual">("manual");
  const [rawInput, setRawInput] = useState(initialGtin || "");
  const [candidate, setCandidate] = useState<ProductCandidate | null>(null);

  // S2 Evidence & Candidate Matcher state
  const [ocrAdapter] = useState(() => new LocalOcrAdapter({ useSimulated: true }));
  const [observations, setObservations] = useState<Observation[]>([]);
  const [evidenceState, setEvidenceState] = useState<ResolvedEvidenceState | null>(null);
  const [rankedCandidates, setRankedCandidates] = useState<RankedCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<RankedCandidate | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<VerifiedFoodProduct | null>(null);

  // Multi-panel guided capture state
  const [capturedPanels, setCapturedPanels] = useState<string[]>(["front", "ingredients", "allergen_declaration", "nutrition"]);
  const [activePanelInput, setActivePanelInput] = useState<string | null>(null);
  const [panelDraftText, setPanelDraftText] = useState("");
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>("");
  const [isScanningActive, setIsScanningActive] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);

  // Upload state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);

  // Conflict & Multi-Code State
  const [qrPayloadInfo, setQrPayloadInfo] = useState<{
    payload: string;
    classType: PayloadClass;
    domainPreview: string;
  } | null>(null);

  // Physical Pack Confirmation Inputs
  const [physicalIdentity, setPhysicalIdentity] = useState("");
  const [labelVersion, setLabelVersion] = useState("Batch / Formulation 2026");
  const [userHasCheckedPack, setUserHasCheckedPack] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Analysis result
  const [confirmedLabel, setConfirmedLabel] = useState<ConfirmedLabel | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DetailedFoodAnalysis | null>(null);

  // Pantry Save Modal
  const [isPantrySaveOpen, setIsPantrySaveOpen] = useState(false);
  const [pantryQty, setPantryQty] = useState("1");
  const [pantryLocation, setPantryLocation] = useState<"Pantry" | "Fridge" | "Freezer">("Pantry");
  const [pantryNotice, setPantryNotice] = useState("");

  useEffect(() => {
    if (initialGtin) {
      setRawInput(initialGtin);
      resolveInitialCandidate(initialGtin);
    }
  }, [initialGtin]);

  // Camera lifecycle cleanup
  useEffect(() => {
    return () => {
      if (stream) {
        stopCameraStream(stream);
      }
    };
  }, [stream]);

  // Camera start/stop
  async function startLiveCamera() {
    setCameraError("");
    try {
      if (stream) stopCameraStream(stream);
      const mediaStream = await requestCameraStream();
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setIsScanningActive(true);
      scanVideoLoop(mediaStream);
    } catch (err) {
      setCameraError(
        err instanceof Error ? err.message : "Camera access denied. Please use photo upload or manual entry."
      );
      setActiveMode("manual");
    }
  }

  function stopLiveCamera() {
    if (stream) {
      stopCameraStream(stream);
      setStream(null);
    }
    setIsScanningActive(false);
  }

  // Scan frame from video feed
  function scanVideoLoop(activeStream: MediaStream) {
    if (!videoRef.current || !activeStream.active) return;

    const canvas = document.createElement("canvas");
    const video = videoRef.current;
    if (video.videoWidth && video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        decodeBarcodeFromImageData(imageData).then((codes) => {
          if (codes.length > 0 && codes[0]) {
            handleCodeDiscovered(codes[0].rawValue);
            stopLiveCamera();
          } else if (activeStream.active && isScanningActive) {
            requestAnimationFrame(() => scanVideoLoop(activeStream));
          }
        });
        return;
      }
    }
    if (activeStream.active) {
      setTimeout(() => scanVideoLoop(activeStream), 250);
    }
  }

  function handleToggleCamera() {
    stopLiveCamera();
    setTimeout(() => startLiveCamera(), 300);
  }

  function handleToggleTorch() {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      if (track) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const capabilities = track?.getCapabilities?.() as any;
        if (capabilities && "torch" in capabilities) {
          const next = !torchOn;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          track.applyConstraints({ advanced: [{ torch: next }] as any }).then(() => setTorchOn(next));
        } else {
          alert("Torch / flashlight is not supported by your hardware or browser.");
        }
      }
    }
  }

  // File Upload Handling
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingUpload(true);
    setErrorMessage("");
    const previewUrl = URL.createObjectURL(file);
    setUploadedImage(previewUrl);

    try {
      const detected = await decodeBarcodeFromFile(file);

      if (detected.length > 0 && detected[0]) {
        handleCodeDiscovered(detected[0].rawValue);
      } else {
        // Fallback: search product catalog or prompt manual
        setErrorMessage("No clear barcode found in the image. You can confirm product identity below.");
        resolveInitialCandidate("Uploaded Photo Candidate");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error reading image file.");
    } finally {
      setIsProcessingUpload(false);
    }
  }

  // Code classification and candidate generation
  function handleCodeDiscovered(rawCode: string) {
    setRawInput(rawCode);
    const classification = classifyPayload(rawCode);

    if (classification === "https_url" || classification === "http_url") {
      try {
        const u = new URL(rawCode);
        setQrPayloadInfo({
          payload: rawCode,
          classType: classification,
          domainPreview: u.hostname
        });
      } catch {
        // fallback
      }
    } else {
      setQrPayloadInfo(null);
    }

    resolveInitialCandidate(rawCode);
  }

  // Helper to record an observation and recalculate candidate rankings
  function applyObservations(newObsList: Observation[]) {
    const resolver = new EvidenceResolver(newObsList);
    const resolved = resolver.resolve();
    const ranked = rankCandidates(resolved, VERIFIED_INDIAN_CATALOG);

    setObservations(newObsList);
    setEvidenceState(resolved);
    setRankedCandidates(ranked);

    const topCandidate = ranked[0] || null;
    setSelectedCandidate(topCandidate);
    setMatchedProduct(topCandidate?.candidate || null);

    if (topCandidate?.candidate) {
      setPhysicalIdentity(`${topCandidate.candidate.brand} ${topCandidate.candidate.productName}`);
    }
  }

  function resolveInitialCandidate(inputStr: string) {
    setErrorMessage("");
    setConfirmedLabel(null);
    setAnalysisResult(null);

    const clean = inputStr.trim();
    const gs1 = parseGs1Payload(clean);
    const initialObsList: Observation[] = [];

    if (gs1.isValid && gs1.gtin) {
      // 1. GS1 Parser Observation
      initialObsList.push({
        observationId: `obs-gs1-${Date.now()}`,
        source: "gs1",
        timestamp: new Date().toISOString(),
        rawPayload: clean,
        confidence: 1.0,
        detectorInfo: { name: "GS1-Syntax-Parser", version: "v13.5" },
        parsedFields: {
          gtin: gs1.gtin,
          batchOrLot: gs1.batchOrLot,
          productionDate: gs1.productionDate,
          bestBeforeDate: gs1.bestBeforeDate,
          expirationDate: gs1.expirationDate,
        },
        warnings: gs1.errors,
      });
    } else {
      const gtin = normaliseGtin(clean);
      if (gtin) {
        // 2. Barcode Symbology Observation
        initialObsList.push({
          observationId: `obs-barcode-${Date.now()}`,
          source: "barcode",
          timestamp: new Date().toISOString(),
          rawPayload: clean,
          confidence: 1.0,
          detectorInfo: { name: "ZXing-WASM", version: "2.2.0" },
          parsedFields: { gtin },
          warnings: [],
        });
      } else {
        // 3. Manual / Text Query Observation
        initialObsList.push({
          observationId: `obs-manual-${Date.now()}`,
          source: "manual",
          timestamp: new Date().toISOString(),
          rawPayload: clean,
          confidence: 0.9,
          detectorInfo: { name: "ManualEntry" },
          parsedFields: { productName: clean },
          warnings: [],
        });
      }
    }

    applyObservations(initialObsList);

    const cand: ProductCandidate = {
      candidateId: crypto.randomUUID(),
      identifier: gs1.gtin || normaliseGtin(clean) || undefined,
      identifierType: gs1.gtin || normaliseGtin(clean) ? "gtin" : "text",
      displayName: clean,
      status: "candidate",
      provenance: [
        activeMode === "camera"
          ? "Live camera barcode decode"
          : activeMode === "upload"
          ? "Product photograph extraction"
          : "Manual identifier entry"
      ],
      observedAt: new Date().toISOString(),
      conflicts: []
    };

    setCandidate(cand);
  }

  // Multi-panel OCR Ingestion
  async function handleOcrPanelSubmit(panelId: string) {
    if (!panelDraftText.trim()) return;

    setIsOcrProcessing(true);
    try {
      const panelType =
        panelId === "front"
          ? "front"
          : panelId === "ingredients"
          ? "ingredients"
          : panelId === "allergen_declaration"
          ? "allergen_statement"
          : panelId === "nutrition"
          ? "nutrition_table"
          : "dates_batch";

      const ocrRes = await ocrAdapter.recognizePanel(panelDraftText, panelType);

      const sourceTag = `ocr_${panelType}` as Observation["source"];
      const newObs: Observation = {
        observationId: `obs-${sourceTag}-${Date.now()}`,
        source: sourceTag,
        timestamp: new Date().toISOString(),
        rawPayload: panelDraftText,
        confidence: ocrRes.confidence,
        detectorInfo: { name: "Tesseract.js-WebWorker", version: "5.1" },
        parsedFields: {
          brand: panelType === "front" ? panelDraftText.split(" ")[0] : undefined,
          productName: panelType === "front" ? panelDraftText : undefined,
          packSize: ocrRes.extractedKeywords.netWeight,
          fssaiLicense: ocrRes.extractedKeywords.fssaiLicense,
          allergens: ocrRes.extractedKeywords.allergens,
          ingredients: panelType === "ingredients" ? panelDraftText.split(",").map((s) => s.trim()) : undefined,
          batchOrLot: ocrRes.extractedKeywords.dates[0],
        },
        warnings: [],
      };

      const updated = [...observations, newObs];
      applyObservations(updated);

      if (!capturedPanels.includes(panelId)) {
        setCapturedPanels([...capturedPanels, panelId]);
      }

      setActivePanelInput(null);
      setPanelDraftText("");
    } finally {
      setIsOcrProcessing(false);
    }
  }

  // User confirmation checkpoint with ConfirmedLabel Gate
  function handleConfirmPhysicalPack() {
    if (!candidate || !selectedCandidate || !evidenceState) return;

    const gate = validateConfirmedLabelGate(selectedCandidate, evidenceState, userHasCheckedPack);
    if (!gate.eligible) {
      setErrorMessage(gate.reasons.join(" "));
      return;
    }

    try {
      const label = createConfirmedLabel({
        candidate,
        physicalIdentity: physicalIdentity.trim(),
        labelVersion: labelVersion.trim(),
        panels: capturedPanels,
        fieldStates: {
          physical_identity: "confirmed",
          ingredients_panel: capturedPanels.includes("ingredients") ? "confirmed" : "unreadable",
          allergen_declaration_panel: capturedPanels.includes("allergen_declaration") ? "confirmed" : "unreadable",
          nutrition_panel: capturedPanels.includes("nutrition") ? "confirmed" : "unreadable"
        },
        evidenceReferences: observations.map((o) => o.observationId)
      });

      setConfirmedLabel(label);

      // Evaluate deterministic food intelligence
      const analysis = evaluateConfirmedFoodLabel(label, matchedProduct || undefined);
      setAnalysisResult(analysis);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to confirm physical label.");
    }
  }

  // Add confirmed product to local pantry
  async function handleSaveToPantry() {
    if (!analysisResult) return;

    const itemId = (analysisResult.productName || "food-item")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");

    const event: PantryEvent & { id: string } = {
      id: crypto.randomUUID(),
      eventId: crypto.randomUUID(),
      itemId,
      eventType: "add",
      quantityDelta: Number(pantryQty) || 1,
      unit: "pack",
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      source: "manual",
      confirmation: true,
      note: `Added from SmartScan to ${pantryLocation}. Confirmed label ID: ${confirmedLabel?.confirmedLabelId.slice(0, 8)}`,
      schemaVersion: 1
    };

    try {
      await putRecord("pantryEvents", event);
      if (confirmedLabel) {
        await putRecord("confirmedLabels", {
          ...confirmedLabel,
          id: confirmedLabel.confirmedLabelId
        });
      }
      setPantryNotice(`Added ${pantryQty} pack(s) of ${analysisResult.productName} to ${pantryLocation}.`);
      setIsPantrySaveOpen(false);
      if (onAddedToKitchen) onAddedToKitchen();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to write to kitchen ledger.");
    }
  }

  function handleResetAll() {
    setCandidate(null);
    setConfirmedLabel(null);
    setAnalysisResult(null);
    setRawInput("");
    setUploadedImage(null);
    setQrPayloadInfo(null);
    setErrorMessage("");
    setPantryNotice("");
    setObservations([]);
    setEvidenceState(null);
    setRankedCandidates([]);
    setSelectedCandidate(null);
    setUserHasCheckedPack(false);
  }

  return (
    <section className="panel smartscan-panel" aria-labelledby="smartscan-heading">
      <div className="panel-heading">
        <div>
          <div className="eyebrow-badge mb-6">
            <Sparkles className="badge-icon-xs text-brand" />
            <span>PRIMARY SCAN WORKFLOW</span>
          </div>
          <h1 id="smartscan-heading" className="panel-title-with-icon">
            SmartScan
          </h1>
        </div>
        <span className="status-tag">Multi-Modal Capture</span>
      </div>

      <p className="panel-subtitle-text">
        Scan a packaged food label to identify product information, review ingredients and understand allergen and nutrition details.
      </p>

      {pantryNotice && <div className="alert-banner alert-success mb-20" role="status">{pantryNotice}</div>}
      {errorMessage && <div className="alert-banner alert-danger mb-20" role="alert">{errorMessage}</div>}

      {/* Input Mode Selector */}
      {!confirmedLabel && (
        <div className="scan-mode-tabs" role="tablist" aria-label="Capture mode selection">
          <button
            type="button"
            className={`mode-tab ${activeMode === "camera" ? "active" : ""}`}
            onClick={() => {
              setActiveMode("camera");
              startLiveCamera();
            }}
            role="tab"
            aria-selected={activeMode === "camera"}
          >
            <Camera className="tab-icon" /> Scan with Camera
          </button>
          <button
            type="button"
            className={`mode-tab ${activeMode === "upload" ? "active" : ""}`}
            onClick={() => {
              setActiveMode("upload");
              stopLiveCamera();
            }}
            role="tab"
            aria-selected={activeMode === "upload"}
          >
            <Upload className="tab-icon" /> Upload Photo
          </button>
          <button
            type="button"
            className={`mode-tab ${activeMode === "manual" ? "active" : ""}`}
            onClick={() => {
              setActiveMode("manual");
              stopLiveCamera();
            }}
            role="tab"
            aria-selected={activeMode === "manual"}
          >
            <Keyboard className="tab-icon" /> Enter Manually
          </button>
        </div>
      )}

      {/* Mode 1: Live Camera Viewfinder */}
      {activeMode === "camera" && !candidate && (
        <div className="camera-viewfinder-container">
          <div className="viewfinder-box">
            <video ref={videoRef} playsInline autoPlay muted className="camera-video-element" />
            {/* Reticle Overlay */}
            <div className="viewfinder-overlay">
              <div className="reticle-corners">
                <div className="corner top-left" />
                <div className="corner top-right" />
                <div className="corner bottom-left" />
                <div className="corner bottom-right" />
              </div>
              <div className="scan-laser-line" />
            </div>
            <p className="viewfinder-hint">Align barcode or QR code inside frame</p>
          </div>

          <div className="camera-controls-bar">
            <button className="secondary-button compact-btn" onClick={handleToggleTorch}>
              <Flashlight className="btn-icon" /> {torchOn ? "Torch Off" : "Torch"}
            </button>
            <button className="secondary-button compact-btn" onClick={handleToggleCamera}>
              <SwitchCamera className="btn-icon" /> Flip Camera
            </button>
            <button className="danger-button compact-btn" onClick={stopLiveCamera}>
              Stop Camera
            </button>
          </div>
          {cameraError && <p className="alert error">{cameraError}</p>}
        </div>
      )}

      {/* Mode 2: Photo / Gallery Upload */}
      {activeMode === "upload" && !candidate && (
        <div className="upload-container">
          <label className="upload-dropzone">
            <input type="file" accept="image/*" onChange={handleFileUpload} hidden />
            <Upload className="dropzone-icon text-brand-green" aria-hidden="true" />
            <h3>Upload Product Label Photograph</h3>
            <p className="tiny text-muted">
              Select or drop a photo of the front pack, ingredients, or barcode. Images are processed locally in your browser and discarded.
            </p>
            <span className="secondary-button compact-btn mt-8">Select File from Device</span>
          </label>

          {isProcessingUpload && (
            <div className="processing-indicator">
              <RefreshCw className="spin btn-icon" /> Reading image & scanning barcodes...
            </div>
          )}

          {uploadedImage && (
            <div className="uploaded-preview-box">
              <img src={uploadedImage} alt="Uploaded packaging label" className="preview-img" />
            </div>
          )}
        </div>
      )}

      {/* Mode 3: Manual Entry & Quick Presets */}
      {activeMode === "manual" && !candidate && (
        <div className="manual-entry-container">
          <div className="input-grid">
            <label htmlFor="manual-gtin-input">Barcode / GTIN / GS1 Digital Link / Product Name</label>
            <div className="input-with-button">
              <input
                id="manual-gtin-input"
                type="text"
                placeholder="Enter 8-14 digit GTIN, GS1 URL, or product name"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                maxLength={4096}
              />
              <button
                className="primary-button"
                onClick={() => resolveInitialCandidate(rawInput)}
                disabled={!rawInput.trim()}
              >
                Find Candidate
              </button>
            </div>
          </div>

          {/* Quick-Test Presets */}
          <div className="presets-container mt-16">
            <p className="tiny text-muted">Quick-test with verified Indian packaged products:</p>
            <div className="preset-buttons-grid">
              {VERIFIED_INDIAN_CATALOG.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  className="preset-chip"
                  onClick={() => {
                    setRawInput(item.gtin);
                    resolveInitialCandidate(item.gtin);
                  }}
                >
                  <span className="preset-brand">{item.brand}</span>
                  <span className="preset-name">{item.productName.slice(0, 24)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Candidate Resolution & Side-by-Side Review */}
      {candidate && !confirmedLabel && selectedCandidate && (
        <div className="candidate-resolution-section mt-24">
          {/* QR Safety Preview If Applicable */}
          {qrPayloadInfo && (
            <div className="qr-safety-banner mb-16">
              <div className="qr-banner-header">
                <ShieldCheck className="btn-icon text-brand-green" />
                <strong>QR Code Decoded — Anti-Phishing Guard</strong>
              </div>
              <p className="tiny text-muted">
                FoodCue never automatically navigates or crawls QR URLs.
              </p>
              <div className="qr-preview-data">
                <span>Domain: <strong>{qrPayloadInfo.domainPreview}</strong></span>
                <span className="scheme-tag">{qrPayloadInfo.classType}</span>
              </div>
            </div>
          )}

          {/* Hard Conflict Banner if any conflict exists */}
          {evidenceState?.hasHardConflicts && (
            <div className="conflict-alert-box mb-16">
              <strong>
                <AlertTriangle className="btn-icon" /> Hard Conflict Detected Across Observed Panels
              </strong>
              <p className="mt-8">
                Incompatible packaging observations were recorded. Silent promotion is blocked until verified against the physical pack.
              </p>
              <ul className="mt-8">
                {evidenceState.conflicts.map((c) => (
                  <li key={c.conflictId}>{c.explanation}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Side-by-Side Candidate Comparison */}
          <div className="comparison-card">
            <div className="card-top-row">
              <span className={`status-tag ${selectedCandidate.isBlockedByConflict ? "warning" : "success"}`}>
                {selectedCandidate.isBlockedByConflict ? "Blocked Candidate" : "Ranked Candidate"}
              </span>
              <span className="score-badge">
                Ranking Score Q: {selectedCandidate.score.toFixed(2)} (S: {selectedCandidate.similarityScore.toFixed(2)}, E: {selectedCandidate.evidenceCoverage.toFixed(2)})
              </span>
            </div>

            <h3 className="candidate-title">{selectedCandidate.candidate.brand} — {selectedCandidate.candidate.productName}</h3>
            <p className="tiny text-muted">
              Category: {selectedCandidate.candidate.category} • Pack: {selectedCandidate.candidate.packSize} • GTIN: {selectedCandidate.candidate.gtin}
            </p>

            {/* Alternative Ranked Candidates Selector */}
            {rankedCandidates.length > 1 && (
              <div className="candidate-selector-bar mt-12 mb-12">
                <span className="tiny text-muted">Ranked candidate alternatives:</span>
                <div className="preset-buttons-grid mt-4">
                  {rankedCandidates.slice(0, 4).map((rc) => (
                    <button
                      key={rc.candidate.id}
                      className={`preset-chip ${selectedCandidate.candidate.id === rc.candidate.id ? "checked" : ""}`}
                      onClick={() => {
                        setSelectedCandidate(rc);
                        setMatchedProduct(rc.candidate);
                        setPhysicalIdentity(`${rc.candidate.brand} ${rc.candidate.productName}`);
                      }}
                    >
                      <span className="preset-brand">{rc.candidate.brand}</span>
                      <span className="preset-name">{rc.candidate.productName.slice(0, 18)} (Q: {rc.score.toFixed(2)})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence Coverage Meter */}
            {evidenceState && (
              <div className="evidence-coverage-box mt-16">
                <div className="evidence-meter-header">
                  <span>Evidence Coverage ($E$): {Math.round(evidenceState.evidenceCoverage * 100)}%</span>
                  <span className="tiny text-muted">Formula: $Q = S \times \min(1, E / 0.70)$</span>
                </div>
                <div className="meter-track">
                  <div
                    className={`meter-fill ${evidenceState.evidenceCoverage < 0.5 ? "warning" : ""}`}
                    style={{ width: `${Math.min(100, Math.round(evidenceState.evidenceCoverage * 100))}%` }}
                  />
                </div>

                {/* Provenance Ledger */}
                <div className="provenance-ledger">
                  {observations.map((obs) => (
                    <div key={obs.observationId} className="provenance-entry">
                      <span className="provenance-source">[{obs.source}]</span>
                      <span>{obs.rawPayload.slice(0, 45)}...</span>
                      <span className="provenance-conf">Conf: {(obs.confidence * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Field Breakdown Table */}
            <div className="comparison-table-wrapper mt-16">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Attribute</th>
                    <th>Observed from Scan / OCR</th>
                    <th>Catalogue Candidate</th>
                    <th>Weight</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedCandidate.fieldBreakdowns.map((fb) => (
                    <tr key={fb.field}>
                      <td style={{ textTransform: "capitalize" }}>{fb.field.replace(/([A-Z])/g, " $1")}</td>
                      <td>{fb.observedValue || <span className="text-muted">Not observed</span>}</td>
                      <td>{fb.candidateValue || "—"}</td>
                      <td>{(fb.weight * 100).toFixed(0)}%</td>
                      <td>
                        <span className={`badge-match ${fb.matched ? "" : "warning"}`} style={{ background: fb.matched ? "#E8F5E9" : "#FFF3E0", color: fb.matched ? "#2E7D32" : "#E65100" }}>
                          {fb.matched ? "Matched" : "Unverified"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Guided Panel Capture Flow */}
            <div className="panel-checklist-section mt-20">
              <div className="section-title-row">
                <Layers className="tiny-icon text-brand-green" />
                <h4>Guided Pack Panel Capture & Ingestion (Local Web Worker OCR):</h4>
              </div>
              <p className="tiny text-muted mt-8">
                Capture key panels to raise evidence coverage $E$ and verify packaging authenticity.
              </p>

              <div className="panel-chips-row mt-8">
                {[
                  { id: "front", label: "Front Panel (Brand & SKU)" },
                  { id: "ingredients", label: "Ingredients Panel" },
                  { id: "allergen_declaration", label: "Allergen Statement" },
                  { id: "nutrition", label: "Nutrition Facts Table" },
                  { id: "dates_batch", label: "Dates, Batch & FSSAI" },
                ].map((p) => {
                  const isCaptured = capturedPanels.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      className={`panel-check-chip ${isCaptured ? "checked" : ""}`}
                      onClick={() => setActivePanelInput(activePanelInput === p.id ? null : p.id)}
                    >
                      <CheckCircle2 className="chip-icon" /> {p.label} {isCaptured ? "✓" : "+ Add"}
                    </button>
                  );
                })}
              </div>

              {/* Panel OCR Input Box */}
              {activePanelInput && (
                <div className="guided-panel-item mt-12">
                  <div className="guided-panel-header">
                    <strong>Capture / OCR: {activePanelInput.toUpperCase().replace("_", " ")} PANEL</strong>
                    <button className="close-btn" onClick={() => setActivePanelInput(null)}><X size={16} /></button>
                  </div>
                  <p className="tiny text-muted mt-8">
                    Type or paste text read from this physical panel. Local Tesseract.js Worker will extract safety tokens.
                  </p>
                  <div className="panel-ocr-input-row">
                    <input
                      type="text"
                      placeholder={`Enter text from ${activePanelInput} panel...`}
                      value={panelDraftText}
                      onChange={(e) => setPanelDraftText(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button
                      className="primary-button compact-btn"
                      onClick={() => handleOcrPanelSubmit(activePanelInput)}
                      disabled={isOcrProcessing || !panelDraftText.trim()}
                    >
                      {isOcrProcessing ? <RefreshCw className="spin btn-icon" /> : <FileText className="btn-icon" />} Ingest Observation
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mandatory User Physical Pack Confirmation */}
            <div className="physical-confirmation-box mt-20">
              <div className="notice mb-16">
                <strong>Non-Negotiable Food Safety Principle:</strong>
                <p>
                  A barcode or catalogue hit is only a candidate. Formulation changes, regional variations, and packaging updates can occur. You must confirm that the physical pack in your hands matches.
                </p>
              </div>

              <div className="input-grid">
                <div>
                  <label htmlFor="confirm-identity">Physical product identity on your packaging</label>
                  <input
                    id="confirm-identity"
                    type="text"
                    value={physicalIdentity}
                    onChange={(e) => setPhysicalIdentity(e.target.value)}
                    placeholder="Confirm exact brand and product name"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="confirm-version">Packaging / formulation version</label>
                  <input
                    id="confirm-version"
                    type="text"
                    value={labelVersion}
                    onChange={(e) => setLabelVersion(e.target.value)}
                    placeholder="e.g. 2026 Batch / Current Label"
                  />
                </div>
              </div>

              <div className="mt-16">
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
                  <input
                    type="checkbox"
                    checked={userHasCheckedPack}
                    onChange={(e) => setUserHasCheckedPack(e.target.checked)}
                  />
                  <span><strong>I have physically reviewed the pack</strong> and verify that the physical product, ingredients, and allergen panel match.</span>
                </label>
              </div>

              <div className="confirmation-action-bar mt-16">
                <button className="secondary-button" onClick={handleResetAll}>
                  Cancel / Scan Another
                </button>
                <button
                  className="primary-button"
                  onClick={handleConfirmPhysicalPack}
                  disabled={!userHasCheckedPack || !physicalIdentity.trim() || selectedCandidate.isBlockedByConflict}
                >
                  <CheckCircle2 className="btn-icon" /> I Confirm This Physical Pack
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Verified Food Intelligence Results Screen */}
      {confirmedLabel && analysisResult && (
        <div className="analysis-results-section mt-24">
          <div className="results-hero-card">
            <div className="card-top-row">
              <span className="status-tag success">Confirmed Physical Pack</span>
              <span className="tiny text-muted">Rule: {analysisResult.ruleVersion}</span>
            </div>

            <h2 className="results-product-name">{analysisResult.productName}</h2>
            <p className="results-subhead">
              <strong>{analysisResult.brand}</strong> • {analysisResult.variant} ({analysisResult.packSize})
              {analysisResult.fssaiLicence && ` • FSSAI Lic. ${analysisResult.fssaiLicence}`}
            </p>

            {/* Allergen Intelligence Card */}
            <div className="intelligence-card allergen-card mt-20">
              <div className="card-header-with-badge">
                <div className="title-group">
                  <ShieldAlert className="card-header-icon text-danger" />
                  <div>
                    <h3>FSSAI Allergen Intelligence</h3>
                    <p className="tiny text-muted">6-state deterministic evidence evaluation</p>
                  </div>
                </div>
              </div>

              <div className="allergen-items-list mt-12">
                {analysisResult.allergens.map((alg) => {
                  const isPositive =
                    alg.state === "declared_contains" || alg.state === "listed_in_ingredients";
                  const isMayContain = alg.state === "declared_may_contain";

                  return (
                    <div key={alg.allergenName} className={`allergen-result-row ${alg.state}`}>
                      <div className="allergen-name-col">
                        <strong>{alg.allergenName}</strong>
                        <span className="tiny text-muted">Source: {alg.panelSource.replaceAll("_", " ")}</span>
                      </div>
                      <div className="allergen-state-col">
                        <span
                          className={`allergen-state-pill ${
                            isPositive ? "state-positive" : isMayContain ? "state-may-contain" : "state-not-detected"
                          }`}
                        >
                          {alg.state.replaceAll("_", " ").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Safeguard Notice */}
              <div className="subtle-notice mt-12">
                ℹ️ <strong>Absence Disclaimer:</strong> &quot;Not detected in extracted text&quot; means no matched allergen term was found in the text read. It is not clinical certification of absence.
              </div>
            </div>

            {/* Ingredients & Additives Breakdown */}
            <div className="intelligence-card mt-20">
              <div className="title-group">
                <ChevronRight className="card-header-icon text-brand-green" />
                <div>
                  <h3>Ingredients & Additives Analysis</h3>
                  <p className="tiny text-muted">Parsed with FSSAI INS numbers and functional purposes</p>
                </div>
              </div>

              <div className="ingredients-chips-cloud mt-12">
                {analysisResult.ingredients.map((ing) => (
                  <div key={ing.name} className={`ingredient-badge ${ing.isAdditive ? "additive" : ""}`}>
                    <span>{ing.name}</span>
                    {ing.purpose && <span className="ingredient-purpose">({ing.purpose})</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Pack-Declared Nutrition Table */}
            <div className="intelligence-card mt-20">
              <div className="title-group">
                <ChevronRight className="card-header-icon text-info" />
                <div>
                  <h3>Pack-Declared Nutrition Facts</h3>
                  <p className="tiny text-muted">Per 100g / 100ml as printed on packaging</p>
                </div>
              </div>

              <div className="nutrition-table-wrapper mt-12">
                <table className="nutrition-table">
                  <thead>
                    <tr>
                      <th>Nutrient</th>
                      <th>Per 100g / 100ml</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(analysisResult.nutritionPer100g).map(([key, val]) => (
                      <tr key={key}>
                        <td className="nutrient-label">{key}</td>
                        <td className="nutrient-val"><strong>{val}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Emergency Guidance Module */}
            {analysisResult.emergencyGuidance && (
              <div className="emergency-guidance-card mt-20">
                <div className="emergency-header">
                  <PhoneCall className="emergency-icon" />
                  <div>
                    <h4>{analysisResult.emergencyGuidance.headline}</h4>
                    <span className="emergency-number-tag">
                      Call {analysisResult.emergencyGuidance.emergencyNumber}
                    </span>
                  </div>
                </div>
                <ul className="plain-list tiny text-danger mt-8">
                  {analysisResult.emergencyGuidance.instructions.map((inst, idx) => (
                    <li key={idx}>{inst}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Bar */}
            <div className="results-cta-bar mt-24">
              <button className="primary-button" onClick={() => setIsPantrySaveOpen(true)}>
                <Plus className="btn-icon" /> Add to Kitchen Pantry
              </button>
              <button className="secondary-button" onClick={handleResetAll}>
                Scan Next Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add To Pantry Dialog */}
      {isPantrySaveOpen && analysisResult && (
        <div className="modal-backdrop" onClick={() => setIsPantrySaveOpen(false)}>
          <div className="modal-card compact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Confirmed Product to Kitchen</h3>
              <button className="close-btn" onClick={() => setIsPantrySaveOpen(false)}>
                <X />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Save <strong>{analysisResult.productName}</strong> to your local household ledger:
              </p>
              <div className="input-grid mt-12">
                <div className="two-col">
                  <div>
                    <label htmlFor="p-qty">Quantity</label>
                    <input
                      id="p-qty"
                      type="number"
                      min="1"
                      value={pantryQty}
                      onChange={(e) => setPantryQty(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="p-loc">Storage Location</label>
                    <select
                      id="p-loc"
                      value={pantryLocation}
                      onChange={(e) => setPantryLocation(e.target.value as "Pantry" | "Fridge" | "Freezer")}
                    >
                      <option>Pantry</option>
                      <option>Fridge</option>
                      <option>Freezer</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer-row mt-16">
              <button className="secondary-button" onClick={() => setIsPantrySaveOpen(false)}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleSaveToPantry}>
                Confirm Ledger Addition
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
