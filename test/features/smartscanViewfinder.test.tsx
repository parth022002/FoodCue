import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SmartScanViewfinder } from "../../src/features/smartscan/SmartScanViewfinder";

describe("SmartScanViewfinder Mobile Camera Controls", () => {
  afterEach(() => {
    cleanup();
  });
  function createMockStream(capabilities: Record<string, unknown> = {}) {
    const applyConstraintsMock = vi.fn().mockResolvedValue(undefined);
    const mockTrack = {
      kind: "video",
      enabled: true,
      stop: vi.fn(),
      getCapabilities: vi.fn().mockReturnValue(capabilities),
      getSettings: vi.fn().mockReturnValue({}),
      applyConstraints: applyConstraintsMock,
    };

    return {
      stream: {
        getVideoTracks: vi.fn().mockReturnValue([mockTrack]),
        getTracks: vi.fn().mockReturnValue([mockTrack]),
      } as unknown as MediaStream,
      mockTrack,
      applyConstraintsMock,
    };
  }

  it("renders viewfinder video and standard control buttons", () => {
    const { stream } = createMockStream();
    const stopMock = vi.fn();

    render(<SmartScanViewfinder stream={stream} onStopCamera={stopMock} />);

    expect(screen.getByLabelText("Live camera packaging feed")).toBeDefined();
    expect(screen.getByRole("button", { name: /Turn flashlight/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Stop live camera/i })).toBeDefined();
  });

  it("applies torch constraint when torch toggle is clicked on supported device", async () => {
    const { stream, applyConstraintsMock } = createMockStream({ torch: true });

    render(<SmartScanViewfinder stream={stream} onStopCamera={vi.fn()} />);

    const torchBtn = screen.getByRole("button", { name: /Turn flashlight on/i });
    fireEvent.click(torchBtn);

    expect(applyConstraintsMock).toHaveBeenCalledWith({
      advanced: [{ torch: true }],
    });
  });

  it("renders accessible zoom slider when hardware zoom is supported", async () => {
    const { stream, applyConstraintsMock } = createMockStream({
      zoom: { min: 1, max: 4, step: 0.5 },
    });

    render(<SmartScanViewfinder stream={stream} onStopCamera={vi.fn()} />);

    const slider = screen.getByLabelText("Camera Zoom Level") as HTMLInputElement;
    expect(slider).toBeDefined();
    expect(slider.min).toBe("1");
    expect(slider.max).toBe("4");

    fireEvent.change(slider, { target: { value: "2.5" } });
    expect(applyConstraintsMock).toHaveBeenCalledWith({
      advanced: [{ zoom: 2.5 }],
    });
  });

  it("triggers onStopCamera when stop button is clicked", () => {
    const { stream } = createMockStream();
    const stopMock = vi.fn();

    render(<SmartScanViewfinder stream={stream} onStopCamera={stopMock} />);

    const stopBtn = screen.getByRole("button", { name: /Stop live camera/i });
    fireEvent.click(stopBtn);

    expect(stopMock).toHaveBeenCalled();
  });
});
