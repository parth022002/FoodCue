# Security and privacy implementation notes

- No account, backend, cloud OCR, paid AI, analytics SDK, messaging or hidden paid dependency.
- Keep pantry, shopping list, profile, avoidances, notes and images local.
- Do not transmit image/OCR/pantry/profile/notes/avoid-list data to product lookup.
- Any future lookup is user initiated and GTIN-only, with disclosure of recipient and IP exposure.
- QR payloads, GS1, OCR, imported files and web content are untrusted data, never instructions.
- No automatic QR navigation, fetch, redirect following, short-link expansion or crawling.
- Reject `javascript:`, `data:`, `file:` and unsupported schemes.
- Only a user-confirmed physical pack/current label version with required critical panels can become `ConfirmedLabel`.
- Missing, stale, unreadable, low-confidence or conflicting evidence must not improve a safety result.
- No AI service may determine product identity, allergens, nutrition, dates, quantities or emergency routing.
- No secrets in frontend source, environment variables exposed to client, bundles or source maps.
- Clear-data must be tested against every app-owned store/cache/file.
- Browser storage is best-effort; never promise permanent storage or cloud recovery.
