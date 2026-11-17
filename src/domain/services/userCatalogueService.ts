/**
 * FoodCue User-Specific Product Catalogue Service
 * Controlling Baseline: Master Development Prompt Section 6 (User-Specific Catalogue & Data Storage)
 *
 * Invariants:
 * 1. Strict Tenant Isolation: User A NEVER sees User B's catalogue items.
 * 2. Guest Privacy: Guests are never saved to persistent storage.
 * 3. Explicit Consent: Products are only saved to catalogue upon explicit user click ("Add to My Catalogue").
 * 4. Deduplication: The same product cannot be added twice to the same user's catalogue.
 */

import type { UserCatalogueItem, IntelligentProductReport } from "../entities/nutritionalProfile";

const USER_CATALOGUE_PREFIX = "foodcue_user_catalog_";

export class UserCatalogueService {
  /**
   * Retrieves all items in the user's personal catalogue.
   * Scoped strictly by userId.
   */
  async getUserCatalogue(userId: string): Promise<UserCatalogueItem[]> {
    if (!userId || userId === "guest") {
      return []; // Guests have no persistent catalogue
    }

    try {
      const storageKey = `${USER_CATALOGUE_PREFIX}${userId}`;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as UserCatalogueItem[];
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Saves a product explicitly to the user's personal catalogue.
   * Prevents duplicates by gtin or product report id.
   */
  async saveProduct(
    userId: string,
    report: IntelligentProductReport
  ): Promise<{ success: boolean; item?: UserCatalogueItem; error?: string }> {
    if (!userId || userId === "guest") {
      return { success: false, error: "Please sign in to save products to your personal catalogue." };
    }

    const currentList = await this.getUserCatalogue(userId);

    // Check duplicate
    const existing = currentList.find(
      (item) => (report.gtin && item.gtin === report.gtin) || item.id === report.id || item.productName.toLowerCase() === report.productName.toLowerCase()
    );

    if (existing) {
      return { success: true, item: existing, error: "Product is already in your catalogue." };
    }

    const newItem: UserCatalogueItem = {
      id: `uc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId,
      gtin: report.gtin,
      productName: report.productName,
      brand: report.brand,
      category: report.category,
      imageUrl: report.imageUrl,
      healthScore: report.healthAssessment.score,
      healthCategory: report.healthAssessment.category,
      savedAt: new Date().toISOString(),
      lastViewedAt: new Date().toISOString(),
      productReport: report
    };

    const updated = [newItem, ...currentList];
    try {
      localStorage.setItem(`${USER_CATALOGUE_PREFIX}${userId}`, JSON.stringify(updated));
      return { success: true, item: newItem };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Failed to save product" };
    }
  }

  /**
   * Removes a product from the user's personal catalogue.
   */
  async removeProduct(userId: string, catalogueItemId: string): Promise<boolean> {
    if (!userId || userId === "guest") return false;

    const currentList = await this.getUserCatalogue(userId);
    const updated = currentList.filter((item) => item.id !== catalogueItemId);

    try {
      localStorage.setItem(`${USER_CATALOGUE_PREFIX}${userId}`, JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks whether a product is currently in the user's catalogue.
   */
  async isProductSaved(userId: string, gtinOrId: string): Promise<boolean> {
    if (!userId || userId === "guest") return false;
    const currentList = await this.getUserCatalogue(userId);
    return currentList.some((item) => item.gtin === gtinOrId || item.id === gtinOrId || item.productReport.id === gtinOrId);
  }
}

export const userCatalogueService = new UserCatalogueService();
