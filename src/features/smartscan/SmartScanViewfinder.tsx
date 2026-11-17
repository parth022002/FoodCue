import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Flashlight,
  SwitchCamera,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Square,
  AlertCircle,
  Eye,
} from "lucide-react";

export interface SmartScanViewfinderProps {
  stream: MediaStream | null;
  onFrameCapture?: (canvas: HTMLCanvasElement) => void;
  onFlipCamera?: () => void;
  onStopCamera: () => void;
  scanHint?: string;
}

export function SmartScanViewfinder({
  stream,
  onFlipCamera,
  onStopCamera,
  scanHint = "Align barcode or packaging label inside frame",
}: SmartScanViewfinderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Hardware capability state
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number; step: number } | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(1);
  const [hasFocusMode, setHasFocusMode] = useState<boolean>(false);

  // UI state
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; visible: boolean } | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string>("");

  // Inspect camera track capabilities
  useEffect(() => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try {
        const playPromise = videoRef.current.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {});
        }
      } catch {
        // Ignored for testing and unautoplay environments
      }
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : {};

      if ("torch" in capabilities) {
        setHasTorch(Boolean(capabilities.torch));
      } else {
        setHasTorch(false);
      }

      if ("zoom" in capabilities && typeof capabilities.zoom === "object") {
        setZoomRange({
          min: capabilities.zoom.min || 1,
          max: capabilities.zoom.max || 5,
          step: capabilities.zoom.step || 0.1,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const settings = track.getSettings ? (track.getSettings() as any) : {};
        setCurrentZoom(settings.zoom || capabilities.zoom.min || 1);
      } else {
        setZoomRange(null);
      }

      if ("focusMode" in capabilities && Array.isArray(capabilities.focusMode)) {
        setHasFocusMode(capabilities.focusMode.includes("continuous") || capabilities.focusMode.includes("manual"));
      } else {
        setHasFocusMode(false);
      }
    } catch {
      setHasTorch(false);
      setZoomRange(null);
      setHasFocusMode(false);
    }
  }, [stream]);

  // Torch Toggle
  const toggleTorch = useCallback(async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const next = !torchOn;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await track.applyConstraints({ advanced: [{ torch: next }] as any });
      setTorchOn(next);
      setNoticeMessage(next ? "Torch active" : "Torch off");
      setTimeout(() => setNoticeMessage(""), 2000);
    } catch {
      setNoticeMessage("Torch control not supported on this device/hardware.");
      setTimeout(() => setNoticeMessage(""), 3000);
    }
  }, [stream, torchOn]);

  // Zoom Handler
  const applyZoom = useCallback(
    async (newZoom: number) => {
      if (!stream || !zoomRange) return;
      const track = stream.getVideoTracks()[0];
      if (!track) return;

      const bounded = Math.max(zoomRange.min, Math.min(zoomRange.max, newZoom));
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await track.applyConstraints({ advanced: [{ zoom: bounded }] as any });
        setCurrentZoom(bounded);
      } catch {
        setNoticeMessage("Hardware zoom constraint failed.");
        setTimeout(() => setNoticeMessage(""), 2500);
      }
    },
    [stream, zoomRange]
  );

  // Reset Zoom
  const resetZoom = useCallback(() => {
    if (zoomRange) {
      applyZoom(zoomRange.min);
    }
  }, [zoomRange, applyZoom]);

  // Tap-to-Focus Handler
  const handleTapToFocus = useCallback(
    async (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0]?.clientX ?? 0 : e.clientX;
      const clientY = "touches" in e ? e.touches[0]?.clientY ?? 0 : e.clientY;

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      setFocusPoint({ x, y, visible: true });
      setTimeout(() => setFocusPoint((prev) => (prev ? { ...prev, visible: false } : null)), 1500);

      if (!stream) return;
      const track = stream.getVideoTracks()[0];
      if (!track) return;

      try {
        // Apply focus continuous or manual constraint if supported
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await track.applyConstraints({ advanced: [{ focusMode: "continuous" }] as any });
      } catch {
        // Fail quietly if not supported by browser
      }
    },
    [stream]
  );

  // Pinch-to-zoom touch gesture handling
  const touchDistanceRef = useRef<number | null>(null);
  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (e.touches.length === 2 && zoomRange) {
        const t1 = e.touches[0]!;
        const t2 = e.touches[1]!;
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

        if (touchDistanceRef.current !== null) {
          const delta = (dist - touchDistanceRef.current) * 0.01;
          applyZoom(currentZoom + delta);
        }
        touchDistanceRef.current = dist;
      }
    },
    [zoomRange, currentZoom, applyZoom]
  );

  const handleTouchEnd = useCallback(() => {
    touchDistanceRef.current = null;
  }, []);

  return (
    <div
      className="camera-viewfinder-container"
      ref={containerRef}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ position: "relative", userSelect: "none", overflow: "hidden" }}
    >
      {/* Video Viewfinder */}
      <div className="viewfinder-box" onClick={handleTapToFocus}>
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="camera-video-element"
          aria-label="Live camera packaging feed"
        />

        {/* Reticle Overlay */}
        <div className="viewfinder-overlay" aria-hidden="true">
          <div className="reticle-corners">
            <div className="corner top-left" />
            <div className="corner top-right" />
            <div className="corner bottom-left" />
            <div className="corner bottom-right" />
          </div>
          <div className="scan-laser-line" />
        </div>

        {/* Animated Tap-to-Focus Reticle */}
        {focusPoint && focusPoint.visible && (
          <div
            className="tap-focus-indicator"
            style={{
              position: "absolute",
              left: `${focusPoint.x}px`,
              top: `${focusPoint.y}px`,
              transform: "translate(-50%, -50%)",
              width: "48px",
              height: "48px",
              border: "2px solid #22c55e",
              borderRadius: "50%",
              pointerEvents: "none",
              animation: "focus-pulse 0.4s ease-out",
            }}
            aria-hidden="true"
          />
        )}

        <p className="viewfinder-hint">{scanHint}</p>
      </div>

      {/* Ephemeral Feedback Toast */}
      {noticeMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "absolute",
            top: "12px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.85)",
            color: "#ffffff",
            padding: "6px 14px",
            borderRadius: "20px",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            zIndex: 10,
          }}
        >
          <AlertCircle size={14} className="text-brand-green" />
          <span>{noticeMessage}</span>
        </div>
      )}

      {/* Zoom Control Bar (Accessible Slider + Buttons) */}
      {zoomRange && (
        <div
          className="zoom-controls-bar mt-12 mb-8"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(241, 245, 249, 0.9)",
            padding: "8px 14px",
            borderRadius: "8px",
          }}
          aria-label="Camera optical zoom controls"
        >
          <button
            type="button"
            className="secondary-button compact-btn"
            onClick={() => applyZoom(currentZoom - (zoomRange.step * 2 || 0.2))}
            aria-label="Zoom out"
            disabled={currentZoom <= zoomRange.min}
            style={{ padding: "4px 8px" }}
          >
            <ZoomOut size={16} />
          </button>

          <label htmlFor="camera-zoom-slider" className="sr-only">
            Camera Zoom Level
          </label>
          <input
            id="camera-zoom-slider"
            type="range"
            min={zoomRange.min}
            max={zoomRange.max}
            step={zoomRange.step}
            value={currentZoom}
            onChange={(e) => applyZoom(parseFloat(e.target.value))}
            style={{ flex: 1, cursor: "pointer" }}
            aria-valuemin={zoomRange.min}
            aria-valuemax={zoomRange.max}
            aria-valuenow={currentZoom}
            aria-valuetext={`${currentZoom.toFixed(1)}x zoom`}
          />

          <button
            type="button"
            className="secondary-button compact-btn"
            onClick={() => applyZoom(currentZoom + (zoomRange.step * 2 || 0.2))}
            aria-label="Zoom in"
            disabled={currentZoom >= zoomRange.max}
            style={{ padding: "4px 8px" }}
          >
            <ZoomIn size={16} />
          </button>

          <button
            type="button"
            className="secondary-button compact-btn"
            onClick={resetZoom}
            aria-label="Reset zoom to 1x"
            style={{ padding: "4px 8px", fontSize: "11px" }}
          >
            <RotateCcw size={12} style={{ marginRight: "3px" }} /> {currentZoom.toFixed(1)}x
          </button>
        </div>
      )}

      {/* Main Controls Action Bar */}
      <div
        className="camera-controls-bar mt-12"
        style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center" }}
      >
        {/* Torch Toggle */}
        <button
          type="button"
          className={`secondary-button compact-btn ${torchOn ? "active" : ""}`}
          onClick={toggleTorch}
          aria-pressed={torchOn}
          aria-label={torchOn ? "Turn flashlight off" : "Turn flashlight on"}
          title={hasTorch ? "Hardware torch supported" : "Hardware torch unverified"}
          style={{ minHeight: "44px", minWidth: "44px" }}
        >
          <Flashlight size={16} className={torchOn ? "text-brand-green" : ""} />
          <span>{torchOn ? "Torch On" : "Torch"}</span>
        </button>

        {/* Flip Camera */}
        {onFlipCamera && (
          <button
            type="button"
            className="secondary-button compact-btn"
            onClick={onFlipCamera}
            aria-label="Switch between front and rear camera"
            style={{ minHeight: "44px", minWidth: "44px" }}
          >
            <SwitchCamera size={16} />
            <span>Flip Camera</span>
          </button>
        )}

        {/* Tap to Focus Hint */}
        {hasFocusMode && (
          <span
            className="tiny text-muted"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "11px",
              padding: "4px 8px",
            }}
          >
            <Eye size={12} /> Tap to focus supported
          </span>
        )}

        {/* Stop Camera Button */}
        <button
          type="button"
          className="danger-button compact-btn"
          onClick={onStopCamera}
          aria-label="Stop live camera and return to mode selector"
          style={{ minHeight: "44px", minWidth: "44px" }}
        >
          <Square size={14} style={{ marginRight: "4px" }} />
          <span>Stop Camera</span>
        </button>
      </div>
    </div>
  );
}
