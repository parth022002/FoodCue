import { beforeEach, describe, expect, it } from "vitest";
import { clearFoodCueData } from "../../src/adapters/storage/database";
import { CATALOG_VERSION, FMCG_500_CATALOG } from "../../src/domain/entities/fmcgCatalogData";
import { fmcgCatalog } from "../../src/domain/services/fmcgCatalogManager";
import { findProductByGtin, searchCatalog, VERIFIED_INDIAN_CATALOG } from "../../src/domain/entities/catalogData";

describe("Milestone 6: Offline Indian FMCG Barcode Catalogue", () => {
  beforeEach(async () => {
    await clearFoodCueData();
  });

  it("contains exactly 500 verified products with 50 items per brand across 10 top Indian FMCG brands", () => {
    expect(FMCG_500_CATALOG.length).toBe(500);

    const targetBrands = [
      "Amul",
      "Mother Dairy",
      "Parle",
      "Britannia",
      "Aashirvaad",
      "Tata",
      "Haldiram's",
      "MDH",
      "Everest",
      "Nestlé India"
    ];

    const brandCounts: Record<string, number> = {};
    for (const p of FMCG_500_CATALOG) {
      brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
    }

    for (const brand of targetBrands) {
      expect(brandCounts[brand]).toBe(50);
    }
  });

  it("validates GS1 EAN-13 check digit algorithm across all 500 catalog items", () => {
    function isValidGtin13(gtin: string): boolean {
      if (!/^\d{13}$/.test(gtin)) return false;
      let sum = 0;
      for (let i = 0; i < 12; i++) {
        const digit = parseInt(gtin[i], 10);
        sum += i % 2 === 0 ? digit * 1 : digit * 3;
      }
      const checkDigit = (10 - (sum % 10)) % 10;
      return checkDigit === parseInt(gtin[12], 10);
    }

    for (const product of FMCG_500_CATALOG) {
      expect(isValidGtin13(product.gtin)).toBe(true);
    }
  });

  it("seeds 500 products into IndexedDB verifiedCatalog store and updates metadata version", async () => {
    const result = await fmcgCatalog.seedCatalogIfRequired();
    expect(result.seeded).toBe(true);
    expect(result.count).toBe(500);
    expect(result.version).toBe(CATALOG_VERSION);

    // Second call without force should be idempotent and not re-seed
    const secondCall = await fmcgCatalog.seedCatalogIfRequired();
    expect(secondCall.seeded).toBe(false);
  });

  it("resolves product by GTIN via lookupGtin from IndexedDB and fallback", async () => {
    await fmcgCatalog.seedCatalogIfRequired();

    // Amul Taaza 500ml
    const amulTaaza = FMCG_500_CATALOG[0];
    const resolved = await fmcgCatalog.lookupGtin(amulTaaza.gtin);

    expect(resolved).not.toBeNull();
    expect(resolved?.productName).toBe(amulTaaza.productName);
    expect(resolved?.brand).toBe("Amul");
    expect(resolved?.fssaiLicence).toBe("10012021000071");
  });

  it("returns null for unknown GTIN barcode", async () => {
    const missing = await fmcgCatalog.lookupGtin("9999999999999");
    expect(missing).toBeNull();
  });

  it("searches catalog with text query and brand filters", async () => {
    await fmcgCatalog.seedCatalogIfRequired();

    const biscuits = await fmcgCatalog.search("biscuits", { brand: "Parle" });
    expect(biscuits.length).toBeGreaterThan(0);
    expect(biscuits.every((b) => b.brand === "Parle")).toBe(true);

    const noodles = await fmcgCatalog.search("noodles", { limit: 5 });
    expect(noodles.length).toBeLessThanOrEqual(5);
    expect(noodles.some((n) => n.productName.toLowerCase().includes("noodle"))).toBe(true);
  });

  it("maintains backward compatibility with VERIFIED_INDIAN_CATALOG and findProductByGtin", () => {
    expect(VERIFIED_INDIAN_CATALOG.length).toBeGreaterThanOrEqual(500);

    const parleG = findProductByGtin("8901719101037");
    expect(parleG).toBeDefined();
    expect(parleG?.brand).toBe("Parle");

    const searchResults = searchCatalog("Haldiram");
    expect(searchResults.length).toBeGreaterThan(0);
  });

  it("ensures every catalog product complies with safety invariants and FSSAI disclosure requirements", () => {
    for (const p of FMCG_500_CATALOG) {
      expect(p.fssaiLicence).toBeTruthy();
      expect(p.fssaiLicence.length).toBe(14);
      expect(p.category).toBeTruthy();
      expect(p.nutritionPer100g).toBeDefined();
      expect(p.nutritionPer100g.energyKcal).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(p.allergensDeclared)).toBe(true);
      expect(p.sourceReference).toBeTruthy();
    }
  });
});
