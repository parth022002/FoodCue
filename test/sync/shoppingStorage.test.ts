import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { shoppingStorage } from "../../src/adapters/storage/shoppingStorage";

describe("FoodCue Shopping Storage & Sync Integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads initial shopping items when storage is empty", async () => {
    const items = await shoppingStorage.loadItems();
    expect(items.length).toBeGreaterThanOrEqual(4);
    expect(items[0].name).toBe("Tata Iodised Salt");
  });

  it("adds a new shopping item and persists it", async () => {
    const added = await shoppingStorage.addItem({
      name: "Organic Honey",
      quantity: 1,
      unit: "jar",
      category: "Staples",
      isBought: false
    });

    expect(added.id).toBeDefined();
    expect(added.name).toBe("Organic Honey");

    const items = await shoppingStorage.loadItems();
    const found = items.find((i) => i.id === added.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe("Organic Honey");
  });

  it("updates an item's status (toggle bought)", async () => {
    const added = await shoppingStorage.addItem({
      name: "Almond Butter",
      quantity: 1,
      unit: "jar",
      category: "Breakfast",
      isBought: false
    });

    await shoppingStorage.updateItem(added.id, { isBought: true });

    const items = await shoppingStorage.loadItems();
    const found = items.find((i) => i.id === added.id);
    expect(found?.isBought).toBe(true);
  });

  it("deletes an item and removes it from storage", async () => {
    const added = await shoppingStorage.addItem({
      name: "Green Tea",
      quantity: 2,
      unit: "boxes",
      category: "Beverages",
      isBought: false
    });

    await shoppingStorage.deleteItem(added.id);

    const items = await shoppingStorage.loadItems();
    const found = items.find((i) => i.id === added.id);
    expect(found).toBeUndefined();
  });

  it("merges remote items using LWW conflict resolution", async () => {
    const added = await shoppingStorage.addItem({
      name: "Basmati Rice",
      quantity: 5,
      unit: "kg",
      category: "Staples",
      isBought: false
    });

    const futureTime = new Date(Date.now() + 60000).toISOString();
    await shoppingStorage.mergeRemoteItems([
      {
        listItemId: added.id,
        productName: "Basmati Rice (Premium Aged)",
        requestedQuantity: 10,
        unit: "kg",
        category: "Staples",
        checked: true,
        updatedAt: futureTime
      }
    ]);

    const items = await shoppingStorage.loadItems();
    const found = items.find((i) => i.id === added.id);
    expect(found?.name).toBe("Basmati Rice (Premium Aged)");
    expect(found?.quantity).toBe(10);
    expect(found?.isBought).toBe(true);
  });
});
