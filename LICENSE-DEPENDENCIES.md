# Dependency review register

This starter pins direct package versions in `package.json`. Before first release:
- Generate and commit `package-lock.json`.
- Verify exact package licences and transitive dependency licences.
- Review maintenance activity, package provenance, advisories and bundle sizes.
- Run dependency and secret scans.
- Generate an SBOM for each release candidate.
- Do not load unpinned WASM/model assets from arbitrary CDNs.
