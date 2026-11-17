import crypto from "crypto";

export interface SvixHeaders {
  id: string;
  timestamp: string;
  signature: string;
}

export interface VerifyWebhookOptions {
  toleranceSeconds?: number;
}

/**
 * Verifies the authenticity of incoming Clerk / Svix webhook requests.
 * Uses native Node.js crypto for high-performance, zero-dependency HMAC SHA-256 validation.
 *
 * @param rawBody - The unparsed raw string body of the incoming request
 * @param headers - Svix headers: svix-id, svix-timestamp, svix-signature
 * @param secret - The Clerk webhook signing secret (whsec_...)
 * @param options - Verification options (tolerance in seconds, default: 300s = 5m)
 * @returns true if valid, throws an Error if invalid or expired
 */
export function verifySvixSignature(
  rawBody: string,
  headers: SvixHeaders,
  secret: string,
  options: VerifyWebhookOptions = {}
): boolean {
  const { toleranceSeconds = 300 } = options;

  if (!secret || typeof secret !== "string") {
    throw new Error("Missing or invalid webhook signing secret");
  }

  const { id, timestamp, signature } = headers;

  if (!id || !timestamp || !signature) {
    throw new Error("Missing required Svix headers (id, timestamp, or signature)");
  }

  // 1. Verify timestamp to defend against replay attacks
  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum)) {
    throw new Error("Invalid svix-timestamp format");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampNum) > toleranceSeconds) {
    throw new Error("Webhook signature timestamp is outside tolerance window");
  }

  // 2. Extract base64 secret key
  const cleanedSecret = secret.startsWith("whsec_") ? secret.substring(6) : secret;
  const keyBytes = Buffer.from(cleanedSecret, "base64");

  // 3. Compute expected signature over: "${id}.${timestamp}.${rawBody}"
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const computedSignature = crypto
    .createHmac("sha256", keyBytes)
    .update(signedContent)
    .digest("base64");

  // 4. Svix signature header may contain multiple space-separated signatures (e.g. "v1,signature1 v1,signature2")
  const signatures = signature.split(" ");
  let matched = false;

  const computedBuffer = Buffer.from(computedSignature);

  for (const versionedSig of signatures) {
    const parts = versionedSig.split(",");
    if (parts.length < 2) continue;
    const version = parts[0];
    const sig = parts[1];

    if (version !== "v1" || !sig) continue;

    const sigBuffer = Buffer.from(sig);
    if (sigBuffer.length === computedBuffer.length && crypto.timingSafeEqual(sigBuffer, computedBuffer)) {
      matched = true;
      break;
    }
  }

  if (!matched) {
    throw new Error("Svix webhook signature verification failed: signature mismatch");
  }

  return true;
}

/**
 * Helper to generate a valid Svix signature string for testing and mock payloads.
 */
export function generateSvixSignature(
  rawBody: string,
  id: string,
  timestamp: string,
  secret: string
): string {
  const cleanedSecret = secret.startsWith("whsec_") ? secret.substring(6) : secret;
  const keyBytes = Buffer.from(cleanedSecret, "base64");
  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const signature = crypto.createHmac("sha256", keyBytes).update(signedContent).digest("base64");
  return `v1,${signature}`;
}
