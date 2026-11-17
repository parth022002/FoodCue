/**
 * Offline Indian FMCG Barcode Catalogue Manager
 * Phase 7-10 Master Product Completion
 *
 * Provides versioned seeding, fast IndexedDB querying, GTIN resolution,
 * and offline search for 500 verified Indian FMCG products across 10 top brands.
 *
 * Invariant: Catalogue suggestions NEVER bypass ConfirmedLabel safety gates.
 */

import { openDatabase } from "../../adapters/storage/database";
import type { VerifiedFoodProduct } from "../entities/catalogData";
import { CATALOG_VERSION, FMCG_500_CATALOG } from "../entities/fmcgCatalogData";

export interface CatalogStats {
  totalProducts: number;
  brands: string[];
  version: number;
  seededAt?: string;
}

export interface CatalogSearchFilter {
  brand?: string;
  category?: string;
  limit?: number;
}

export class FmcgCatalogManager {
  private static instance: FmcgCatalogManager;
  private isSeeding = false;

  public static getInstance(): FmcgCatalogManager {
    if (!FmcgCatalogManager.instance) {
      FmcgCatalogManager.instance = new FmcgCatalogManager();
    }
    return FmcgCatalogManager.instance;
  }

  /**
   * Seeds the 500-product catalogue into IndexedDB verifiedCatalog store if not yet seeded
   * or if CATALOG_VERSION has incremented.
   */
  public async seedCatalogIfRequired(force = false): Promise<{ seeded: boolean; count: number; version: number }> {
    if (typeof indexedDB === "undefined") {
      return { seeded: false, count: FMCG_500_CATALOG.length, version: CATALOG_VERSION };
    }

    if (this.isSeeding) {
      return { seeded: false, count: FMCG_500_CATALOG.length, version: CATALOG_VERSION };
    }

    this.isSeeding = true;
    try {
      const db = await openDatabase();

      if (!db.objectStoreNames.contains("verifiedCatalog") || !db.objectStoreNames.contains("metadata")) {
        return { seeded: false, count: 0, version: 0 };
      }

      // Check current seeded version
      const currentVersion = await new Promise<number>((resolve) => {
        const tx = db.transaction("metadata", "readonly");
        const store = tx.objectStore("metadata");
        const req = store.get("fmcg_catalog_version");
        req.onsuccess = () => resolve(req.result?.value ?? 0);
        req.onerror = () => resolve(0);
      });

      if (!force && currentVersion >= CATALOG_VERSION) {
        // Already seeded and up to date
        return { seeded: false, count: FMCG_500_CATALOG.length, version: currentVersion };
      }

      // Perform bulk seeding in a single readwrite transaction
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(["verifiedCatalog", "metadata"], "readwrite");
        const catalogStore = tx.objectStore("verifiedCatalog");
        const metaStore = tx.objectStore("metadata");

        for (const product of FMCG_500_CATALOG) {
          catalogStore.put(product);
        }

        metaStore.put({
          key: "fmcg_catalog_version",
          value: CATALOG_VERSION,
          updatedAt: new Date().toISOString()
        });

        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error ?? new Error("Failed to seed FMCG catalogue."));
        tx.onabort = () => reject(new Error("FMCG catalogue seeding transaction aborted."));
      });

      return { seeded: true, count: FMCG_500_CATALOG.length, version: CATALOG_VERSION };
    } finally {
      this.isSeeding = false;
    }
  }

  /**
   * Looks up a product by GTIN barcode in IndexedDB with in-memory fallback
   */
  public async lookupGtin(gtin: string): Promise<VerifiedFoodProduct | null> {
    const cleanGtin = gtin.trim().replace(/\s+/g, "");
    if (!cleanGtin) return null;

    if (typeof indexedDB !== "undefined") {
      try {
        const db = await openDatabase();
        if (db.objectStoreNames.contains("verifiedCatalog")) {
          const product = await new Promise<VerifiedFoodProduct | undefined>((resolve) => {
            const tx = db.transaction("verifiedCatalog", "readonly");
            const store = tx.objectStore("verifiedCatalog");
            const req = store.get(cleanGtin);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(undefined);
          });

          if (product) return product;
        }
      } catch {
        // Fallback to in-memory lookup if IndexedDB is unavailable
      }
    }

    // In-memory fallback
    const match = FMCG_500_CATALOG.find((p) => p.gtin === cleanGtin);
    return match ?? null;
  }

  /**
   * Fast search across verified catalogue products by query and optional filters
   */
  public async search(query: string, filters?: CatalogSearchFilter): Promise<VerifiedFoodProduct[]> {
    const q = query.trim().toLowerCase();
    const limit = filters?.limit ?? 50;

    let pool: VerifiedFoodProduct[] = [];

    if (typeof indexedDB !== "undefined") {
      try {
        const db = await openDatabase();
        if (db.objectStoreNames.contains("verifiedCatalog")) {
          pool = await new Promise<VerifiedFoodProduct[]>((resolve) => {
            const tx = db.transaction("verifiedCatalog", "readonly");
            const store = tx.objectStore("verifiedCatalog");
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          });
        }
      } catch {
        // Fallback to in-memory
      }
    }

    if (pool.length === 0) {
      pool = FMCG_500_CATALOG;
    }

    const filtered = pool.filter((p) => {
      if (filters?.brand && p.brand.toLowerCase() !== filters.brand.toLowerCase()) {
        return false;
      }
      if (filters?.category && p.category.toLowerCase() !== filters.category.toLowerCase()) {
        return false;
      }
      if (!q) return true;

      return (
        p.productName.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.variant.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.gtin.includes(q)
      );
    });

    return filtered.slice(0, limit);
  }

  /**
   * Retrieves catalogue summary statistics
   */
  public async getStats(): Promise<CatalogStats> {
    const brandsSet = new Set<string>();
    for (const p of FMCG_500_CATALOG) {
      brandsSet.add(p.brand);
    }

    return {
      totalProducts: FMCG_500_CATALOG.length,
      brands: Array.from(brandsSet).sort(),
      version: CATALOG_VERSION
    };
  }
}

export const fmcgCatalog = FmcgCatalogManager.getInstance();
