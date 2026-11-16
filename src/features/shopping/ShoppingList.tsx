import React, { useState } from "react";
import { ShoppingBag, Plus, Trash2, Check, Download, Share2, Sparkles } from "lucide-react";

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  isBought: boolean;
}

export function ShoppingList() {
  const [items, setItems] = useState<ShoppingItem[]>([
    { id: "1", name: "Tata Iodised Salt", quantity: 1, unit: "kg", category: "Staples", isBought: false },
    { id: "2", name: "Amul Pasteurised Butter", quantity: 2, unit: "packs", category: "Dairy", isBought: false },
    { id: "3", name: "Whole Wheat Atta", quantity: 5, unit: "kg", category: "Staples", isBought: true },
    { id: "4", name: "Quaker Rolled Oats", quantity: 1, unit: "pack", category: "Breakfast", isBought: false }
  ]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("pack");
  const [category, setCategory] = useState("Groceries");
  const [shareNotice, setShareNotice] = useState("");

  function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: ShoppingItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      quantity: Number(quantity) || 1,
      unit,
      category,
      isBought: false
    };

    setItems((prev) => [newItem, ...prev]);
    setName("");
    setQuantity("1");
  }

  function toggleBought(id: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isBought: !item.isBought } : item))
    );
  }

  function deleteItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function clearBought() {
    setItems((prev) => prev.filter((item) => !item.isBought));
  }

  function handleAddLowStockItems() {
    const suggestions: ShoppingItem[] = [
      { id: crypto.randomUUID(), name: "Maggi 2-Minute Noodles", quantity: 4, unit: "packs", category: "Snacks", isBought: false },
      { id: crypto.randomUUID(), name: "Epigamia Greek Yogurt", quantity: 2, unit: "cups", category: "Dairy", isBought: false }
    ];
    setItems((prev) => [...suggestions, ...prev]);
    setShareNotice("Added 2 depleted pantry staples to your shopping list.");
    setTimeout(() => setShareNotice(""), 3500);
  }

  function handleExportText() {
    const unbought = items.filter((i) => !i.isBought);
    const text = `🛒 FoodCue Shopping List (${new Date().toLocaleDateString()}):\n` +
      unbought.map((i, idx) => `${idx + 1}. ${i.name} - ${i.quantity} ${i.unit}`).join("\n");

    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setShareNotice("Shopping list copied to clipboard! Ready to paste into WhatsApp or notes.");
      setTimeout(() => setShareNotice(""), 4000);
    }
  }

  function handleExportCsv() {
    const header = "Item,Quantity,Unit,Category,Status\n";
    const rows = items
      .map((i) => `"${i.name}",${i.quantity},"${i.unit}","${i.category}","${i.isBought ? "Bought" : "Pending"}"`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `foodcue-shopping-list-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const pendingItems = items.filter((i) => !i.isBought);
  const boughtItems = items.filter((i) => i.isBought);

  return (
    <section className="panel" aria-labelledby="shopping-list-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">KITCHEN ORGANISER</p>
          <h2 id="shopping-list-heading" className="panel-title-with-icon">
            <ShoppingBag className="title-icon text-brand-green" aria-hidden="true" />
            Smart Shopping List
          </h2>
        </div>
        <div className="header-actions">
          <button className="secondary-button compact-btn" onClick={handleAddLowStockItems}>
            <Sparkles className="btn-icon" aria-hidden="true" /> Add Depleted Items
          </button>
        </div>
      </div>

      <p className="muted">
        Manage household grocery runs. Check off items in the store, export to WhatsApp, or sync with confirmed pantry stock.
      </p>

      {/* Add Item Form */}
      <form onSubmit={addItem} className="shopping-input-box">
        <div className="input-row-grid">
          <div className="input-group flex-2">
            <label htmlFor="shop-name">Item to Buy</label>
            <input
              id="shop-name"
              type="text"
              placeholder="e.g. Mustard Seeds, Amul Ghee, Bread"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="input-group flex-1">
            <label htmlFor="shop-qty">Qty</label>
            <input
              id="shop-qty"
              type="number"
              min="0.1"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="input-group flex-1">
            <label htmlFor="shop-unit">Unit</label>
            <select id="shop-unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
              <option>pack</option>
              <option>kg</option>
              <option>g</option>
              <option>litre</option>
              <option>ml</option>
              <option>cups</option>
              <option>bottle</option>
            </select>
          </div>
          <div className="input-group flex-1">
            <label htmlFor="shop-cat">Category</label>
            <select id="shop-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option>Groceries</option>
              <option>Staples</option>
              <option>Dairy</option>
              <option>Vegetables</option>
              <option>Snacks</option>
              <option>Bakery</option>
            </select>
          </div>
        </div>
        <button type="submit" className="primary-button add-item-btn" disabled={!name.trim()}>
          <Plus className="btn-icon" aria-hidden="true" /> Add to List
        </button>
      </form>

      {shareNotice && (
        <div className="alert info" role="status">
          {shareNotice}
        </div>
      )}

      {/* Action Bar */}
      <div className="list-toolbar">
        <span className="count-label">
          <strong>{pendingItems.length}</strong> items remaining ({boughtItems.length} bought)
        </span>
        <div className="toolbar-buttons">
          <button className="secondary-button compact-btn" onClick={handleExportText}>
            <Share2 className="btn-icon" aria-hidden="true" /> Share (WhatsApp)
          </button>
          <button className="secondary-button compact-btn" onClick={handleExportCsv}>
            <Download className="btn-icon" aria-hidden="true" /> Export CSV
          </button>
          {boughtItems.length > 0 && (
            <button className="secondary-button compact-btn text-danger" onClick={clearBought}>
              <Trash2 className="btn-icon" aria-hidden="true" /> Clear Completed
            </button>
          )}
        </div>
      </div>

      {/* Items Section */}
      <div className="shopping-items-container">
        {items.length === 0 ? (
          <div className="empty-state-box">
            <ShoppingBag className="empty-icon text-muted" aria-hidden="true" />
            <h3>Your shopping list is empty</h3>
            <p className="muted">Add grocery items manually or import depleted staples from your pantry.</p>
          </div>
        ) : (
          <div className="items-list">
            {/* Pending Items */}
            {pendingItems.map((item) => (
              <div key={item.id} className="shopping-row">
                <button
                  className="check-circle"
                  onClick={() => toggleBought(item.id)}
                  aria-label={`Mark ${item.name} as bought`}
                >
                  <div className="check-inner" />
                </button>
                <div className="item-text-group" onClick={() => toggleBought(item.id)}>
                  <span className="item-title">{item.name}</span>
                  <span className="item-sub">{item.category}</span>
                </div>
                <div className="item-qty-tag">
                  {item.quantity} {item.unit}
                </div>
                <button
                  className="icon-only-btn"
                  onClick={() => deleteItem(item.id)}
                  title="Remove from list"
                  aria-label={`Delete ${item.name}`}
                >
                  <Trash2 className="tiny-icon text-muted" />
                </button>
              </div>
            ))}

            {/* Completed Items */}
            {boughtItems.length > 0 && (
              <div className="completed-group">
                <h4 className="completed-header">Completed Items</h4>
                {boughtItems.map((item) => (
                  <div key={item.id} className="shopping-row completed-row">
                    <button
                      className="check-circle checked"
                      onClick={() => toggleBought(item.id)}
                      aria-label={`Uncheck ${item.name}`}
                    >
                      <Check className="check-svg" aria-hidden="true" />
                    </button>
                    <div className="item-text-group" onClick={() => toggleBought(item.id)}>
                      <span className="item-title strike">{item.name}</span>
                      <span className="item-sub">{item.category}</span>
                    </div>
                    <div className="item-qty-tag">
                      {item.quantity} {item.unit}
                    </div>
                    <button
                      className="icon-only-btn"
                      onClick={() => deleteItem(item.id)}
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 className="tiny-icon text-muted" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
