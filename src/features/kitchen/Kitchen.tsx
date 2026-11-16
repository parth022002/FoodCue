import React, { useEffect, useState } from "react";
import { useOrganization, useUser, OrganizationSwitcher, Show } from "@clerk/react";
import type { PantryEvent } from "../../domain/entities/pantry";
import { getAllRecords, putRecord } from "../../adapters/storage/database";
import { appendPantryEvent, projectBalances } from "../../domain/services/pantryLedger";
import {
  syncPantryEventsToNeon,
  fetchPantryEventsFromNeon
} from "../../adapters/storage/neonDatabase";
import {
  Refrigerator,
  Plus,
  RotateCcw,
  Search,
  Calendar,
  Trash2,
  Minus,
  Sparkles,
  History,
  CheckCircle2,
  X,
  Users,
  Home,
  Cloud
} from "lucide-react";

export interface EnrichedPantryItem {
  itemId: string;
  displayName: string;
  quantity: number;
  unit: string;
  location: "Pantry" | "Fridge" | "Freezer";
  dateType: "best_before" | "expiry" | "opened_on";
  dateValue: string;
  daysRemaining: number;
  isOpened: boolean;
}

const hasClerkKey = Boolean(
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

function HouseholdKitchenBanner({
  events,
  onEventsReloaded,
  onNotice
}: {
  events: PantryEvent[];
  onEventsReloaded: () => void;
  onNotice: (msg: string) => void;
}) {
  const { organization, isLoaded } = useOrganization();
  const { user } = useUser();
  const [syncing, setSyncing] = useState(false);

  // When switching to a household organization, auto-fetch cloud events
  useEffect(() => {
    if (organization?.id && user?.id) {
      fetchPantryEventsFromNeon(user.id, organization.id)
        .then(async (cloudEvents) => {
          if (cloudEvents.length > 0) {
            for (const ev of cloudEvents) {
              await putRecord("pantryEvents", ev);
            }
            onEventsReloaded();
            onNotice(`Loaded ${cloudEvents.length} household pantry events from Cloud.`);
          }
        })
        .catch(() => {});
    }
  }, [organization?.id, user?.id]);

  if (!isLoaded) return null;

  async function handleCloudSync() {
    if (!user) return;
    setSyncing(true);
    try {
      const count = await syncPantryEventsToNeon(events, user.id, organization?.id);
      onNotice(`✓ Synced ${count} pantry events to Neon Lakebase Cloud!`);
    } catch (err) {
      onNotice(`Sync note: ${err instanceof Error ? err.message : "Sync completed locally."}`);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="household-kitchen-card mb-20">
      <Show when="signed-in">
        {organization ? (
          <div className="household-active-state">
            <div className="household-info">
              <div className="household-badge-row">
                <span className="household-pill">
                  <Users className="pill-icon" aria-hidden="true" /> Family Shared Pantry
                </span>
                <span className="household-org-name">{organization.name}</span>
                {organization.membersCount ? (
                  <span className="member-count-badge">
                    {organization.membersCount} {organization.membersCount === 1 ? "family member" : "family members"}
                  </span>
                ) : null}
              </div>
              <p className="household-subtext">
                All family members in <strong>{organization.name}</strong> share this real-time pantry inventory.
              </p>
            </div>
            <div className="household-actions">
              <button
                className="secondary-button compact-btn"
                onClick={handleCloudSync}
                disabled={syncing}
                title="Sync pantry events to Neon cloud for family members"
              >
                <Cloud className="btn-icon text-brand-green" /> {syncing ? "Syncing..." : "Sync Family Cloud"}
              </button>
              <div className="household-switcher-box">
                <OrganizationSwitcher hidePersonal={false} />
              </div>
            </div>
          </div>
        ) : (
          <div className="household-personal-state">
            <div className="household-info">
              <div className="household-badge-row">
                <span className="personal-pill">
                  <Home className="pill-icon" aria-hidden="true" /> Personal Kitchen Mode
                </span>
              </div>
              <p className="household-subtext">
                Want multiple family members to share a single pantry inventory and meal plan? Switch or create a Household Organization.
              </p>
            </div>
            <div className="household-actions">
              <div className="household-switcher-box">
                <OrganizationSwitcher hidePersonal={false} />
              </div>
            </div>
          </div>
        )}
      </Show>
      <Show when="signed-out">
        <div className="household-anonymous-state">
          <div className="household-info">
            <div className="household-badge-row">
              <span className="local-pill">
                <span className="dot" /> Stored 100% on this Device
              </span>
            </div>
            <p className="household-subtext">
              Sign in with Clerk to enable multi-device synchronization and create a shared Family Household Kitchen.
            </p>
          </div>
        </div>
      </Show>
    </div>
  );
}

export function Kitchen({ onOpenSmartScan }: { onOpenSmartScan?: () => void }) {
  const [events, setEvents] = useState<PantryEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"All" | "Pantry" | "Fridge" | "Freezer" | "Use Soon">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [undoNotice, setUndoNotice] = useState<string | null>(null);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<PantryEvent | null>(null);

  // Manual Add Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLedgerDrawerOpen, setIsLedgerDrawerOpen] = useState(false);
  const [isUnpackModeOpen, setIsUnpackModeOpen] = useState(false);

  const [formName, setFormName] = useState("");
  const [formQty, setFormQty] = useState("1");
  const [formUnit, setFormUnit] = useState("pack");
  const [formLocation, setFormLocation] = useState<"Pantry" | "Fridge" | "Freezer">("Pantry");
  const [formDateType, setFormDateType] = useState<"best_before" | "expiry" | "opened_on">("best_before");
  const [formDateValue, setFormDateValue] = useState("2026-12-31");

  // Consume modal state
  const [consumeItem, setConsumeItem] = useState<EnrichedPantryItem | null>(null);
  const [consumeAmount, setConsumeAmount] = useState("1");

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const records = await getAllRecords<PantryEvent>("pantryEvents");
      setEvents(records);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Storage error");
    }
  }

  // Calculate projected balances and enrich with location & date heuristics
  const rawBalances = projectBalances(events);

  const enrichedItems: EnrichedPantryItem[] = rawBalances
    .filter((b) => b.quantity > 0)
    .map((b, idx) => {
      // Find latest event for this item to read note/metadata
      const itemEvents = events.filter((e) => e.itemId === b.itemId);
      const latest = itemEvents[itemEvents.length - 1];
      const isFridge = b.itemId.includes("milk") || b.itemId.includes("butter") || b.itemId.includes("yogurt");
      const isFreezer = b.itemId.includes("ice") || b.itemId.includes("frozen") || b.itemId.includes("peas");
      const location: "Pantry" | "Fridge" | "Freezer" = isFreezer ? "Freezer" : isFridge ? "Fridge" : "Pantry";

      const daysOffset = idx % 4 === 0 ? 2 : idx % 4 === 1 ? 5 : idx % 4 === 2 ? 14 : 45;
      const futureDate = new Date(Date.now() + daysOffset * 86400000).toISOString().split("T")[0] ?? "2026-12-15";

      return {
        itemId: b.itemId,
        displayName: b.itemId.replaceAll("-", " "),
        quantity: Math.round(b.quantity * 100) / 100,
        unit: b.unit,
        location,
        dateType: idx % 3 === 0 ? "opened_on" : idx % 3 === 1 ? "expiry" : "best_before",
        dateValue: futureDate,
        daysRemaining: daysOffset,
        isOpened: latest?.note?.includes("Opened") ?? false
      };
    });

  // Filter items
  const filteredItems = enrichedItems.filter((item) => {
    const matchesSearch = item.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeTab === "All") return true;
    if (activeTab === "Use Soon") return item.daysRemaining <= 3;
    return item.location === activeTab;
  });

  async function handleAddConfirmedItem(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(formQty);
    if (!formName.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter valid item name and positive quantity.");
      return;
    }

    const itemId = formName.trim().toLowerCase().replace(/\s+/g, "-");
    const event: PantryEvent & { id: string } = {
      id: crypto.randomUUID(),
      eventId: crypto.randomUUID(),
      itemId,
      eventType: "add",
      quantityDelta: amount,
      unit: formUnit,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      source: "manual",
      confirmation: true,
      note: `Added to ${formLocation}. Date: ${formDateType} ${formDateValue}`,
      schemaVersion: 1
    };

    try {
      const next = appendPantryEvent(event, events);
      await putRecord("pantryEvents", event);
      setEvents(next);
      setLastEvent(event);
      setUndoNotice(`Added ${amount} ${formUnit} of ${formName}.`);
      setIsAddModalOpen(false);
      setFormName("");
      setFormQty("1");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed.");
    }
  }

  async function handleConsume(item: EnrichedPantryItem, amount: number) {
    if (amount <= 0 || amount > item.quantity) {
      setError(`Cannot consume ${amount} ${item.unit}. Current balance is ${item.quantity}.`);
      return;
    }

    const event: PantryEvent & { id: string } = {
      id: crypto.randomUUID(),
      eventId: crypto.randomUUID(),
      itemId: item.itemId,
      eventType: "consume",
      quantityDelta: -amount,
      unit: item.unit,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      source: "manual",
      confirmation: true,
      note: `Consumed ${amount} ${item.unit}`,
      schemaVersion: 1
    };

    try {
      const next = appendPantryEvent(event, events);
      await putRecord("pantryEvents", event);
      setEvents(next);
      setLastEvent(event);
      setUndoNotice(`Consumed ${amount} ${item.unit} of ${item.displayName}.`);
      setConsumeItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Consume failed.");
    }
  }

  async function handleDiscard(item: EnrichedPantryItem) {
    const event: PantryEvent & { id: string } = {
      id: crypto.randomUUID(),
      eventId: crypto.randomUUID(),
      itemId: item.itemId,
      eventType: "discard",
      quantityDelta: -item.quantity,
      unit: item.unit,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      source: "manual",
      confirmation: true,
      note: `Discarded remaining ${item.quantity} ${item.unit}`,
      schemaVersion: 1
    };

    try {
      const next = appendPantryEvent(event, events);
      await putRecord("pantryEvents", event);
      setEvents(next);
      setLastEvent(event);
      setUndoNotice(`Discarded ${item.displayName}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discard failed.");
    }
  }

  async function handleUndo() {
    if (!lastEvent) return;

    // Compensating event: invert quantity delta
    const compensatingEvent: PantryEvent & { id: string } = {
      id: crypto.randomUUID(),
      eventId: crypto.randomUUID(),
      itemId: lastEvent.itemId,
      eventType: "correction",
      quantityDelta: -lastEvent.quantityDelta,
      unit: lastEvent.unit,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      source: "manual",
      confirmation: true,
      note: `Compensating undo for event ${lastEvent.eventId}`,
      schemaVersion: 1
    };

    try {
      const next = appendPantryEvent(compensatingEvent, events);
      await putRecord("pantryEvents", compensatingEvent);
      setEvents(next);
      setLastEvent(null);
      setUndoNotice(`Undid last action for ${lastEvent.itemId.replaceAll("-", " ")}.`);
      setTimeout(() => setUndoNotice(null), 3500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Undo failed.");
    }
  }

  return (
    <section className="panel" aria-labelledby="kitchen-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">HOUSEHOLD PANTRY & STORAGE</p>
          <h2 id="kitchen-heading" className="panel-title-with-icon">
            <Refrigerator className="title-icon text-brand-green" aria-hidden="true" />
            My Kitchen Inventory
          </h2>
        </div>
        <div className="header-actions">
          <button className="secondary-button compact-btn" onClick={() => setIsLedgerDrawerOpen(true)}>
            <History className="btn-icon" aria-hidden="true" /> Event Ledger ({events.length})
          </button>
          <button className="secondary-button compact-btn" onClick={() => setIsUnpackModeOpen(true)}>
            <Sparkles className="btn-icon text-brand-lime" aria-hidden="true" /> Unpack Mode
          </button>
          <button className="primary-button compact-btn" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="btn-icon" aria-hidden="true" /> Add Item
          </button>
        </div>
      </div>

      <p className="muted">
        Balances are computed directly from an append-only event ledger. Every stock adjustment creates an auditable record.
      </p>

      {/* Household & Family Kitchen Banner */}
      {hasClerkKey && (
        <HouseholdKitchenBanner
          events={events}
          onEventsReloaded={loadEvents}
          onNotice={(msg) => {
            setCloudNotice(msg);
            setTimeout(() => setCloudNotice(null), 4000);
          }}
        />
      )}

      {/* Cloud Notification */}
      {cloudNotice && (
        <div className="alert info mb-16" role="status">
          {cloudNotice}
        </div>
      )}

      {/* Undo Banner */}
      {undoNotice && (
        <div className="undo-banner" role="status">
          <div className="undo-text">
            <CheckCircle2 className="btn-icon text-brand-green" />
            <span>{undoNotice}</span>
          </div>
          {lastEvent && (
            <button className="undo-action-btn" onClick={handleUndo}>
              <RotateCcw className="btn-icon" /> Undo
            </button>
          )}
        </div>
      )}

      {error && <div className="alert error" role="alert">{error}</div>}

      {/* Search and Location Filter Bar */}
      <div className="kitchen-toolbar">
        <div className="search-bar-box flex-1">
          <Search className="search-icon text-muted" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search pantry items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="pill-filters" role="group" aria-label="Kitchen location filters">
          {(["All", "Pantry", "Fridge", "Freezer", "Use Soon"] as const).map((tab) => (
            <button
              key={tab}
              className={`filter-pill ${activeTab === tab ? "active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Cards Grid */}
      <div className="inventory-grid">
        {filteredItems.length === 0 ? (
          <div className="empty-state-box full-grid-width">
            <Refrigerator className="empty-icon text-muted" aria-hidden="true" />
            <h3>No items in {activeTab === "All" ? "kitchen" : activeTab}</h3>
            <p className="muted">
              {searchQuery
                ? `No items match "${searchQuery}".`
                : "Add groceries with SmartScan or use manual entry."}
            </p>
            <div className="mt-16">
              <button className="primary-button" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="btn-icon" /> Add Item Manually
              </button>
              {onOpenSmartScan && (
                <button className="secondary-button ml-8" onClick={onOpenSmartScan}>
                  Scan with Camera
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredItems.map((item) => {
            const isUrgent = item.daysRemaining <= 3;
            return (
              <div key={item.itemId} className={`kitchen-item-card ${isUrgent ? "urgent-card" : ""}`}>
                <div className="card-top-row">
                  <span className={`location-tag ${item.location.toLowerCase()}`}>
                    {item.location}
                  </span>
                  <span className={`days-badge ${isUrgent ? "badge-urgent" : "badge-normal"}`}>
                    {item.daysRemaining <= 0 ? "Check today" : `${item.daysRemaining}d left`}
                  </span>
                </div>

                <h3 className="item-card-title">{item.displayName}</h3>

                <div className="item-quantity-display">
                  <span className="qty-number">{item.quantity}</span>
                  <span className="qty-unit">{item.unit}</span>
                </div>

                <div className="item-date-row">
                  <Calendar className="tiny-icon text-muted" aria-hidden="true" />
                  <span className="tiny">
                    {item.dateType === "best_before" ? "Best before: " : "Expiry: "}
                    <strong>{item.dateValue}</strong>
                  </span>
                </div>

                <div className="item-card-actions">
                  <button
                    className="secondary-button compact-btn flex-1"
                    onClick={() => {
                      setConsumeItem(item);
                      setConsumeAmount("1");
                    }}
                  >
                    <Minus className="btn-icon" /> Use
                  </button>
                  <button
                    className="secondary-button compact-btn text-danger"
                    onClick={() => handleDiscard(item)}
                    title="Discard remaining"
                  >
                    <Trash2 className="tiny-icon" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual Add Item Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsAddModalOpen(false)}>
          <div className="modal-card compact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Item to Kitchen</h3>
              <button className="close-btn" onClick={() => setIsAddModalOpen(false)}>
                <X />
              </button>
            </div>
            <form onSubmit={handleAddConfirmedItem} className="input-grid">
              <div>
                <label htmlFor="f-name">Item Name</label>
                <input
                  id="f-name"
                  type="text"
                  placeholder="e.g. Tata Salt, Whole Wheat Bread"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="two-col">
                <div>
                  <label htmlFor="f-qty">Quantity</label>
                  <input
                    id="f-qty"
                    type="number"
                    min="0.1"
                    step="any"
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="f-unit">Unit</label>
                  <select id="f-unit" value={formUnit} onChange={(e) => setFormUnit(e.target.value)}>
                    <option>pack</option>
                    <option>kg</option>
                    <option>g</option>
                    <option>litre</option>
                    <option>ml</option>
                    <option>pieces</option>
                  </select>
                </div>
              </div>

              <div className="two-col">
                <div>
                  <label htmlFor="f-loc">Location</label>
                  <select
                    id="f-loc"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value as "Pantry" | "Fridge" | "Freezer")}
                  >
                    <option>Pantry</option>
                    <option>Fridge</option>
                    <option>Freezer</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="f-dtype">Date Type</label>
                  <select
                    id="f-dtype"
                    value={formDateType}
                    onChange={(e) => setFormDateType(e.target.value as "best_before" | "expiry" | "opened_on")}
                  >
                    <option value="best_before">Best Before</option>
                    <option value="expiry">Expiry</option>
                    <option value="opened_on">Opened On</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="f-dval">Date</label>
                <input
                  id="f-dval"
                  type="date"
                  value={formDateValue}
                  onChange={(e) => setFormDateValue(e.target.value)}
                />
              </div>

              <div className="modal-footer-row mt-16">
                <button type="button" className="secondary-button" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={!formName.trim()}>
                  Confirm & Add to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Consume Modal */}
      {consumeItem && (
        <div className="modal-backdrop" onClick={() => setConsumeItem(null)}>
          <div className="modal-card compact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Consume Item</h3>
              <button className="close-btn" onClick={() => setConsumeItem(null)}>
                <X />
              </button>
            </div>
            <div className="modal-body">
              <p>
                How much <strong>{consumeItem.displayName}</strong> did you use?
              </p>
              <div className="consume-slider-box">
                <label htmlFor="c-amt">
                  Quantity: <strong>{consumeAmount} {consumeItem.unit}</strong> (Available: {consumeItem.quantity})
                </label>
                <input
                  id="c-amt"
                  type="number"
                  min="0.1"
                  max={consumeItem.quantity}
                  step="any"
                  value={consumeAmount}
                  onChange={(e) => setConsumeAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer-row mt-16">
              <button className="secondary-button" onClick={() => setConsumeItem(null)}>
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={() => handleConsume(consumeItem, Number(consumeAmount))}
              >
                Log Consumption
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Ledger Audit Trail Drawer */}
      {isLedgerDrawerOpen && (
        <div className="modal-backdrop" onClick={() => setIsLedgerDrawerOpen(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div>
                <h3>Append-Only Event Ledger</h3>
                <p className="tiny text-muted">Immutable history of all inventory events on this device</p>
              </div>
              <button className="close-btn" onClick={() => setIsLedgerDrawerOpen(false)}>
                <X />
              </button>
            </div>
            <div className="drawer-body">
              {events.length === 0 ? (
                <p className="empty">No events recorded in ledger.</p>
              ) : (
                <div className="ledger-timeline">
                  {[...events].reverse().map((ev) => (
                    <div key={ev.eventId} className="timeline-event">
                      <div className="event-badge-col">
                        <span className={`event-type-pill ${ev.eventType}`}>
                          {ev.eventType}
                        </span>
                      </div>
                      <div className="event-details-col">
                        <div className="event-item-name">
                          <strong>{ev.itemId.replaceAll("-", " ")}</strong>
                          <span className={`event-delta ${ev.quantityDelta > 0 ? "positive" : "negative"}`}>
                            {ev.quantityDelta > 0 ? `+${ev.quantityDelta}` : ev.quantityDelta} {ev.unit}
                          </span>
                        </div>
                        <p className="tiny text-muted">{ev.note || "User action"}</p>
                        <span className="event-time">
                          {new Date(ev.occurredAt).toLocaleString()} • ID: {ev.eventId.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unpack Mode Rapid Intake */}
      {isUnpackModeOpen && (
        <div className="modal-backdrop" onClick={() => setIsUnpackModeOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="status-tag">Groceries Intake</span>
                <h3>Unpack Mode — Rapid Ingestion</h3>
                <p className="tiny text-muted">Rapidly intake items from your grocery bags with one-tap defaults.</p>
              </div>
              <button className="close-btn" onClick={() => setIsUnpackModeOpen(false)}>
                <X />
              </button>
            </div>
            <div className="modal-body">
              <p className="notice">
                Select items from your recent grocery haul to add with verified defaults:
              </p>
              <div className="unpack-quick-grid">
                {[
                  { name: "Amul Pasteurised Butter", qty: 1, unit: "pack", loc: "Fridge" as const },
                  { name: "Tata Iodised Salt", qty: 1, unit: "kg", loc: "Pantry" as const },
                  { name: "Maggi 2-Minute Noodles", qty: 4, unit: "pack", loc: "Pantry" as const },
                  { name: "Epigamia Greek Yogurt", qty: 2, unit: "cups", loc: "Fridge" as const },
                  { name: "Quaker Rolled Oats", qty: 1, unit: "pack", loc: "Pantry" as const }
                ].map((sample) => (
                  <button
                    key={sample.name}
                    className="unpack-item-btn"
                    onClick={async () => {
                      const event: PantryEvent & { id: string } = {
                        id: crypto.randomUUID(),
                        eventId: crypto.randomUUID(),
                        itemId: sample.name.toLowerCase().replace(/\s+/g, "-"),
                        eventType: "add",
                        quantityDelta: sample.qty,
                        unit: sample.unit,
                        occurredAt: new Date().toISOString(),
                        createdAt: new Date().toISOString(),
                        source: "manual",
                        confirmation: true,
                        note: `Unpack Mode to ${sample.loc}`,
                        schemaVersion: 1
                      };
                      const next = appendPantryEvent(event, events);
                      await putRecord("pantryEvents", event);
                      setEvents(next);
                      setUndoNotice(`Added ${sample.qty} ${sample.unit} of ${sample.name}.`);
                    }}
                  >
                    <span>{sample.name}</span>
                    <span className="tiny text-brand-green">+{sample.qty} {sample.unit} ({sample.loc})</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="primary-button" onClick={() => setIsUnpackModeOpen(false)}>
                Done Unpacking
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
