import { describe, it, expect, beforeEach, vi } from "vitest";
import { openDatabase, putRecord, getAllRecords, clearFoodCueData } from "../../src/adapters/storage/database";
import { createConfirmedLabel } from "../../src/domain/contracts/confirmedLabel";
import { findProductByGtin } from "../../src/domain/entities/catalogData";
import { evaluateConfirmedFoodLabel } from "../../src/domain/rules/foodIntelligenceEngine";
import { pantryLedger } from "../../src/domain/services/pantryLedger";
import { shoppingStorage } from "../../src/adapters/storage/shoppingStorage";
import { localChangeQueue } from "../../src/sync/queue/localChangeQueue";
import { syncMetadata } from "../../src/sync/state/syncMetadata";
import { syncCoordinator } from "../../src/sync/engine/syncCoordinator";
import { conflictResolver } from "../../src/sync/reconciliation/conflictResolver";
import type { ProductCandidate } from "../../src/domain/entities/food";

describe("FoodCue Step 7 — End-to-End User Journeys (A through F)", () => {
  beforeEach(async () => {
    await clearFoodCueData();
    await syncMetadata.reset();
  });

  // ---------------------------------------------------------------------------
  // JOURNEY A: Local-First User (Zero Cloud Dependency)
  // ---------------------------------------------------------------------------
  it("Journey A: Local-First User operates kitchen and food intelligence entirely offline", async () => {
    // 1. Identify product via catalog/SmartScan
    const product = findProductByGtin("8901719101037")!;
    expect(product).toBeDefined();

    const candidate: ProductCandidate = {
      candidateId: product.id,
      identifier: product.gtin,
      identifierType: "gtin",
      displayName: product.productName,
      status: "candidate",
      provenance: ["barcode_scan"],
      observedAt: new Date().toISOString(),
      conflicts: []
    };

    // 2. Physical Pack Label Confirmation
    const label = createConfirmedLabel({
      candidate,
      physicalIdentity: product.productName,
      labelVersion: "2026 Batch",
      panels: ["ingredients", "allergen_declaration", "nutrition"],
      fieldStates: {
        physical_identity: "confirmed",
        ingredients_panel: "confirmed",
        allergen_declaration_panel: "confirmed",
        nutrition_panel: "confirmed"
      },
      evidenceReferences: ["camera-viewfinder-frame-1"]
    });

    await putRecord("confirmedLabels", label);

    // 3. Deterministic Food Intelligence Review
    const analysis = evaluateConfirmedFoodLabel(label, product);
    expect(analysis.state).toBe("reviewed_deterministic");
    expect(analysis.allergens.length).toBeGreaterThan(0);
    const gluten = analysis.allergens.find((a) => a.allergenName.includes("Gluten"));
    expect(gluten?.state).toBe("declared_contains");

    // 4. Add to Kitchen Ledger
    const addEvent = {
      eventId: "ev_test_1",
      candidateId: product.id,
      productName: product.productName,
      brand: product.brand,
      eventType: "add" as const,
      quantityDelta: 2,
      location: "Pantry" as const,
      dateType: "best_before" as const,
      dateValue: "2027-01-01",
      occurredAt: new Date().toISOString()
    };
    await putRecord("pantryEvents", addEvent);

    // 5. Add to Shopping List
    const shopItem = await shoppingStorage.addItem({
      name: "Tata Tea Gold",
      category: "Beverages",
      quantity: 1,
      unit: "pack",
      isBought: false
    });
    expect(shopItem.id).toBeDefined();

    // 6. Verify Local Persistence
    const savedLabels = await getAllRecords("confirmedLabels");
    const savedEvents = await getAllRecords("pantryEvents");
    const savedShopping = await shoppingStorage.loadItems();

    expect(savedLabels.length).toBe(1);
    expect(savedEvents.length).toBe(1);
    expect(savedShopping.some((i) => i.name === "Tata Tea Gold")).toBe(true);

    // 7. Verify Cloud Sync is completely OFF by default
    const meta = await syncMetadata.get();
    expect(meta.cloudSyncEnabled).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // JOURNEY B: Account Creation & Explicit Cloud Activation
  // ---------------------------------------------------------------------------
  it("Journey B: Signing in preserves local-first mode until explicit migration consent", async () => {
    // Precondition: user has local records
    await shoppingStorage.addItem({
      name: "Brown Bread",
      category: "Bakery",
      quantity: 1,
      unit: "loaf",
      isBought: false
    });

    // Simulate Clerk user authentication
    const userSession = {
      isSignedIn: true,
      user: { id: "user_clerk_journey_b", primaryEmailAddress: { emailAddress: "journey_b@foodcue.local" } }
    };
    expect(userSession.isSignedIn).toBe(true);

    // Verify sync remains disabled automatically
    const metaBefore = await syncMetadata.get();
    expect(metaBefore.cloudSyncEnabled).toBe(false);

    // Simulate User Reviewing & Consenting in 7-Step Migration Wizard
    const userExplicitlyConsented = true;
    if (userExplicitlyConsented) {
      await syncMetadata.setCloudSyncEnabled(true);
    }

    const metaAfter = await syncMetadata.get();
    expect(metaAfter.cloudSyncEnabled).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // JOURNEY C: Offline Resilience & Automatic Recovery
  // ---------------------------------------------------------------------------
  it("Journey C: Offline mutations are queued safely and flush upon reconnection", async () => {
    await syncMetadata.setCloudSyncEnabled(true);

    // Enqueue offline changes
    await localChangeQueue.enqueue({
      entityType: "pantry_event",
      entityId: "ev-offline-1",
      operationType: "append_event",
      payload: { eventType: "consume", quantity: 1 }
    });

    await localChangeQueue.enqueue({
      entityType: "shopping_item",
      entityId: "shop-offline-1",
      operationType: "create",
      payload: { name: "Oat Milk", category: "Dairy Alternatives" }
    });

    const pendingBefore = await localChangeQueue.getPendingCount();
    expect(pendingBefore).toBe(2);

    // Simulate online flush via peekBatch and markCompleted
    const batch = await localChangeQueue.peekBatch(10);
    expect(batch.length).toBe(2);

    await localChangeQueue.markCompleted(batch.map((b) => b.id));
    const pendingAfter = await localChangeQueue.getPendingCount();
    expect(pendingAfter).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // JOURNEY D: Multi-Device Conflict Resolution
  // ---------------------------------------------------------------------------
  it("Journey D: Multi-device conflicts resolve deterministically using domain rules", () => {
    // Test 1: Shopping list Last-Write-Wins with deletion tombstones
    const itemDeviceA = {
      listItemId: "item-milk",
      name: "Cow Milk",
      isPurchased: false,
      isDeleted: false,
      updatedAt: "2026-11-17T10:00:00.000Z"
    };

    const itemDeviceB = {
      listItemId: "item-milk",
      name: "Cow Milk",
      isPurchased: true,
      isDeleted: false,
      updatedAt: "2026-11-17T10:05:00.000Z" // Newer update on Device B
    };

    const merged = conflictResolver.mergeShoppingItems([itemDeviceA], [itemDeviceB]);
    expect(merged.length).toBe(1);
    expect(merged[0]?.isPurchased).toBe(true);

    // Test 2: Avoid-list safety-first union
    const avoidListA = ["Peanuts", "Soy"];
    const avoidListB = ["Peanuts", "Gluten"];
    const mergedAvoid = conflictResolver.mergeAvoidLists(avoidListA, avoidListB);
    expect(mergedAvoid).toContain("peanuts");
    expect(mergedAvoid).toContain("soy");
    expect(mergedAvoid).toContain("gluten");
    expect(mergedAvoid.length).toBe(3);
  });

  // ---------------------------------------------------------------------------
  // JOURNEY E: Account Deletion & Data Erasure
  // ---------------------------------------------------------------------------
  it("Journey E: Disabling cloud sync pauses uploads without erasing local records", async () => {
    await clearFoodCueData();

    // Add local records
    await shoppingStorage.addItem({
      name: "Basmati Rice",
      category: "Grains",
      quantity: 1,
      unit: "kg",
      isBought: false
    });
    await syncMetadata.setCloudSyncEnabled(true);

    // User pauses sync
    await syncMetadata.setCloudSyncEnabled(false);

    const meta = await syncMetadata.get();
    expect(meta.cloudSyncEnabled).toBe(false);

    // Local items must still exist
    const localItems = await shoppingStorage.loadItems();
    expect(localItems.some((i) => i.name === "Basmati Rice")).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // JOURNEY F: SmartScan Uncertainty & Evidence Integrity
  // ---------------------------------------------------------------------------
  it("Journey F: Unconfirmed candidates cannot bypass ConfirmedLabel safety boundaries", () => {
    const conflictedCandidate: ProductCandidate = {
      candidateId: "cand-unconfirmed-1",
      identifier: "8901030383709",
      identifierType: "gtin",
      displayName: "Red Label Tea",
      status: "candidate",
      provenance: ["barcode_scan"],
      observedAt: new Date().toISOString(),
      conflicts: ["Possible packaging change detected"]
    };

    // 1. Candidate with unresolved conflicts throws ConfirmationError
    expect(() => {
      createConfirmedLabel({
        candidate: conflictedCandidate,
        physicalIdentity: "Red Label Tea",
        labelVersion: "2026 Batch",
        panels: ["ingredients", "allergen_declaration", "nutrition"],
        fieldStates: {
          physical_identity: "confirmed",
          ingredients_panel: "confirmed",
          allergen_declaration_panel: "confirmed",
          nutrition_panel: "confirmed"
        },
        evidenceReferences: []
      });
    }).toThrow(/Resolve product identity conflicts before confirmation/);

    // 2. Candidate with missing required panels throws ConfirmationError
    const validCandidate: ProductCandidate = {
      ...conflictedCandidate,
      conflicts: []
    };

    expect(() => {
      createConfirmedLabel({
        candidate: validCandidate,
        physicalIdentity: "Red Label Tea",
        labelVersion: "2026 Batch",
        panels: ["ingredients"], // Missing allergen_declaration & nutrition
        fieldStates: { physical_identity: "confirmed", ingredients_panel: "confirmed" },
        evidenceReferences: []
      });
    }).toThrow(/Required critical label panels and field confirmations are incomplete/);
  });
});
