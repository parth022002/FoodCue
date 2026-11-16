export async function requestCameraStream(): Promise<MediaStream> {
  if (!window.isSecureContext) {
    throw new Error("Camera access requires a secure context (HTTPS or localhost).");
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera access is not supported. Use photo, gallery or manual entry.");
  }
  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: "environment" } }
  });
}

export function stopCameraStream(stream: MediaStream): void {
  for (const track of stream.getTracks()) track.stop();
}
