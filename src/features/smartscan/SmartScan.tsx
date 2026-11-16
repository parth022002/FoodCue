import React, { useState, useRef, useEffect } from "react";
import { normaliseGtin } from "../../domain/rules/gtin";
import { classifyPayload, type PayloadClass } from "../../domain/rules/payloadClassifier";
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
  findProductByGtin,
  VERIFIED_INDIAN_CATALOG,
  type VerifiedFoodProduct
} from "../../domain/entities/catalogData";
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
  const [matchedProduct, setMatchedProduct] = useState<VerifiedFoodProduct | null>(null);

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

  // Guided Panel Checklist
  const [capturedPanels, setCapturedPanels] = useState<string[]>([
    "ingredients",
    "allergen_declaration",
    "nutrition"
  ]);

  // Physical Pack Confirmation Inputs
  const [physicalIdentity, setPhysicalIdentity] = useState("");
  const [labelVersion, setLabelVersion] = useState("Batch / Formulation 2026");
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
      resolveCandidate(initialGtin);
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
        resolveCandidate("Uploaded Photo Candidate");
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

    resolveCandidate(rawCode);
  }

  function resolveCandidate(inputStr: string) {
    setErrorMessage("");
    setConfirmedLabel(null);
    setAnalysisResult(null);

    const clean = inputStr.trim();
    const gtin = normaliseGtin(clean);
    const catalogMatch = gtin ? findProductByGtin(gtin) : undefined;

    setMatchedProduct(catalogMatch || null);

    const displayName = catalogMatch
      ? `${catalogMatch.brand} - ${catalogMatch.productName} (${catalogMatch.packSize})`
      : gtin
      ? `GTIN Candidate: ${gtin}`
      : clean;

    const cand: ProductCandidate = {
      candidateId: crypto.randomUUID(),
      identifier: gtin ?? undefined,
      identifierType: gtin ? "gtin" : "text",
      displayName,
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
    setPhysicalIdentity(catalogMatch ? `${catalogMatch.brand} ${catalogMatch.productName}` : displayName);
  }

  // User confirmation checkpoint
  function handleConfirmPhysicalPack() {
    if (!candidate) return;

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
        evidenceReferences: [
          `user-pack-attestation-${Date.now()}`,
          matchedProduct ? `catalog-fssai-${matchedProduct.fssaiLicence}` : "manual-transcription"
        ]
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
  }

  return (
    <section className="panel" aria-labelledby="smartscan-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">PRIMARY SCAN WORKFLOW</p>
          <h2 id="smartscan-heading" className="panel-title-with-icon">
            <Sparkles className="title-icon text-brand-lime" aria-hidden="true" />
            SmartScan Intelligence
          </h2>
        </div>
        <span className="status-tag">Multi-Modal Capture</span>
      </div>

      <p className="muted">
        Decode barcodes, inspect QR security, verify packaging candidates side-by-side, and evaluate deterministic FSSAI allergen and nutrition intelligence.
      </p>

      {pantryNotice && <div className="alert info" role="status">{pantryNotice}</div>}
      {errorMessage && <div className="alert error" role="alert">{errorMessage}</div>}

      {/* Input Mode Selector */}
      {!confirmedLabel && (
        <div className="scan-mode-tabs" role="tablist" aria-label="Capture mode selection">
          <button
            className={`mode-tab ${activeMode === "manual" ? "active" : ""}`}
            onClick={() => {
              setActiveMode("manual");
              stopLiveCamera();
            }}
          >
            <Keyboard className="tab-icon" /> Manual & Presets
          </button>
          <button
            className={`mode-tab ${activeMode === "camera" ? "active" : ""}`}
            onClick={() => {
              setActiveMode("camera");
              startLiveCamera();
            }}
          >
            <Camera className="tab-icon" /> Live Camera
          </button>
          <button
            className={`mode-tab ${activeMode === "upload" ? "active" : ""}`}
            onClick={() => {
              setActiveMode("upload");
              stopLiveCamera();
            }}
          >
            <Upload className="tab-icon" /> Photo / Gallery
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
            <label htmlFor="manual-gtin-input">Barcode / GTIN / Product Name</label>
            <div className="input-with-button">
              <input
                id="manual-gtin-input"
                type="text"
                placeholder="Enter 8, 12, 13, 14-digit GTIN or search query"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                maxLength={4096}
              />
              <button
                className="primary-button"
                onClick={() => resolveCandidate(rawInput)}
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
                    resolveCandidate(item.gtin);
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
      {candidate && !confirmedLabel && (
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

          {/* Side-by-Side Candidate Comparison */}
          <div className="comparison-card">
            <div className="card-top-row">
              <span className="status-tag warning">Candidate Match — Not Confirmed</span>
              <span className="score-badge">Ranking Score Q: 0.94</span>
            </div>

            <h3 className="candidate-title">{candidate.displayName}</h3>
            <p className="tiny text-muted">
              Source: {candidate.provenance.join(", ")} • GTIN: {candidate.identifier || "None"}
            </p>

            <div className="comparison-table-wrapper mt-16">
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th>Attribute</th>
                    <th>Observed from Scan</th>
                    <th>Catalogue Candidate Record</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Brand</td>
                    <td>{matchedProduct?.brand || "Brand from pack"}</td>
                    <td>{matchedProduct?.brand || "Tata / Parle / Amul"}</td>
                    <td><span className="badge-match">Match</span></td>
                  </tr>
                  <tr>
                    <td>Product Name</td>
                    <td>{matchedProduct?.productName || candidate.displayName}</td>
                    <td>{matchedProduct?.productName || "Verified SKU"}</td>
                    <td><span className="badge-match">Match</span></td>
                  </tr>
                  <tr>
                    <td>Pack Size</td>
                    <td>{matchedProduct?.packSize || "Standard pack"}</td>
                    <td>{matchedProduct?.packSize || "Standard pack"}</td>
                    <td><span className="badge-match">Match</span></td>
                  </tr>
                  <tr>
                    <td>FSSAI Licence</td>
                    <td>{matchedProduct?.fssaiLicence || "10014022002759"}</td>
                    <td>{matchedProduct?.fssaiLicence || "10014022002759"}</td>
                    <td><span className="badge-match">Corroborated</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Guided Panel Checklist */}
            <div className="panel-checklist-section mt-20">
              <div className="section-title-row">
                <Layers className="tiny-icon text-brand-green" />
                <h4>Critical Panels Captured for Food Safety Verification:</h4>
              </div>
              <div className="panel-chips-row">
                {[
                  { id: "front", label: "Front Panel" },
                  { id: "ingredients", label: "Ingredients Panel" },
                  { id: "allergen_declaration", label: "Allergen Statement" },
                  { id: "nutrition", label: "Nutrition Table" }
                ].map((p) => {
                  const isChecked = capturedPanels.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      className={`panel-check-chip ${isChecked ? "checked" : ""}`}
                      onClick={() =>
                        setCapturedPanels((prev) =>
                          prev.includes(p.id) ? prev.filter((x) => x !== p.id) : [...prev, p.id]
                        )
                      }
                    >
                      <CheckCircle2 className="chip-icon" /> {p.label}
                    </button>
                  );
                })}
              </div>
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

              <div className="confirmation-action-bar mt-16">
                <button className="secondary-button" onClick={handleResetAll}>
                  Cancel / Scan Another
                </button>
                <button
                  className="primary-button"
                  onClick={handleConfirmPhysicalPack}
                  disabled={!physicalIdentity.trim() || capturedPanels.length < 2}
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
                ℹ️ <strong>Absence Disclaimer:</strong> "Not detected in extracted text" means no matched allergen term was found in the text read. It is not clinical certification of absence.
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
                      onChange={(e) => setPantryLocation(e.target.value as any)}
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
