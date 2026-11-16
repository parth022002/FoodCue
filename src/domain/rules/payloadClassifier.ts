export type PayloadClass = "https_url" | "http_url" | "unsafe_scheme" | "plain_text" | "gtin" | "malformed";

export function classifyPayload(raw: string): PayloadClass {
  const value = raw.trim();
  if (!value || value.length > 4096) return "malformed";
  if (/^(javascript|data|file):/i.test(value)) return "unsafe_scheme";
  if (/^https:\/\//i.test(value)) {
    try { new URL(value); return "https_url"; } catch { return "malformed"; }
  }
  if (/^http:\/\//i.test(value)) {
    try { new URL(value); return "http_url"; } catch { return "malformed"; }
  }
  if (/^\d+$/.test(value)) return "gtin";
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return "unsafe_scheme";
  return "plain_text";
}
