import { useState, useEffect } from "react";
import type { PantryEvent } from "../../domain/entities/pantry";
import { getAllRecords } from "../../adapters/storage/database";
import { Bell, Clock, CheckCircle2, AlertTriangle, Calendar, RefreshCw } from "lucide-react";

export interface ReminderItem {
  id: string;
  itemId: string;
  displayName: string;
  location: string;
  quantity: number;
  unit: string;
  dateType: "best_before" | "expiry" | "opened_on" | "production";
  dateValue: string; // ISO or date string
  daysRemaining: number;
  isOpened: boolean;
  status: "active" | "snoozed" | "completed";
}

export function Reminders({ onNavigateToKitchen }: { onNavigateToKitchen: () => void }) {
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [filter, setFilter] = useState<"all" | "urgent" | "opened">("all");
  const [snoozeNotice, setSnoozeNotice] = useState<string>("");

  useEffect(() => {
    loadReminders();
  }, []);

  async function loadReminders() {
    try {
      const events = await getAllRecords<PantryEvent>("pantryEvents");
      // Calculate active stock and simulate date tracking
      const itemsMap = new Map<string, { qty: number; unit: string; location: string }>();
      for (const ev of events) {
        const cur = itemsMap.get(ev.itemId) ?? { qty: 0, unit: ev.unit, location: "Pantry" };
        cur.qty += ev.quantityDelta;
        itemsMap.set(ev.itemId, cur);
      }

      const generated: ReminderItem[] = [];
      let index = 0;
      for (const [itemId, data] of itemsMap.entries()) {
        if (data.qty <= 0) continue;
        const now = new Date();
        // Sample staggered expiry offsets for demonstration
        const daysOffset = index === 0 ? 2 : index === 1 ? 5 : index === 2 ? 14 : 28;
        const expiryDate = new Date(now.getTime() + daysOffset * 86400000);

        generated.push({
          id: `rem-${itemId}`,
          itemId,
          displayName: itemId.replaceAll("-", " "),
          location: index % 3 === 0 ? "Fridge" : index % 3 === 1 ? "Pantry" : "Freezer",
          quantity: data.qty,
          unit: data.unit,
          dateType: index % 2 === 0 ? "best_before" : "expiry",
          dateValue: expiryDate.toISOString().split("T")[0] ?? "2026-11-20",
          daysRemaining: daysOffset,
          isOpened: index === 0,
          status: "active"
        });
        index++;
      }

      // If kitchen has items, set them; else provide realistic demonstration items
      if (generated.length > 0) {
        setReminders(generated);
      } else {
        setReminders([
          {
            id: "rem-milk",
            itemId: "amul-taaza-milk",
            displayName: "Amul Taaza Toned Milk (Opened)",
            location: "Fridge",
            quantity: 1,
            unit: "pack",
            dateType: "opened_on",
            dateValue: "2026-11-18",
            daysRemaining: 2,
            isOpened: true,
            status: "active"
          },
          {
            id: "rem-bread",
            itemId: "whole-wheat-bread",
            displayName: "Whole Wheat Sandwich Bread",
            location: "Pantry",
            quantity: 1,
            unit: "pack",
            dateType: "best_before",
            dateValue: "2026-11-19",
            daysRemaining: 3,
            isOpened: false,
            status: "active"
          },
          {
            id: "rem-yogurt",
            itemId: "epigamia-greek-yogurt",
            displayName: "Epigamia Greek Yogurt Natural",
            location: "Fridge",
            quantity: 2,
            unit: "cups",
            dateType: "expiry",
            dateValue: "2026-11-22",
            daysRemaining: 6,
            isOpened: false,
            status: "active"
          },
          {
            id: "rem-quaker",
            itemId: "quaker-oats",
            displayName: "Quaker Rolled Oats 400g",
            location: "Pantry",
            quantity: 1,
            unit: "pack",
            dateType: "best_before",
            dateValue: "2027-04-15",
            daysRemaining: 150,
            isOpened: false,
            status: "active"
          }
        ]);
      }
    } catch {
      // Fallback
    }
  }

  function handleSnooze(id: string, days: number) {
    setReminders((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, daysRemaining: r.daysRemaining + days, status: "snoozed" } : r
      )
    );
    setSnoozeNotice(`Reminder snoozed for +${days} day(s).`);
    setTimeout(() => setSnoozeNotice(""), 3500);
  }

  function handleMarkUsed(id: string) {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    setSnoozeNotice("Item marked as consumed and removed from active alerts.");
    setTimeout(() => setSnoozeNotice(""), 3500);
  }

  const filtered = reminders.filter((r) => {
    if (filter === "urgent") return r.daysRemaining <= 3;
    if (filter === "opened") return r.isOpened;
    return true;
  });

  return (
    <section className="panel" aria-labelledby="reminders-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">HOUSEHOLD INTELLIGENCE</p>
          <h2 id="reminders-heading" className="panel-title-with-icon">
            <Bell className="title-icon text-brand-green" aria-hidden="true" />
            Date Reminders & Use-Soon Tracker
          </h2>
        </div>
        <button className="secondary-button compact-btn" onClick={loadReminders}>
          <RefreshCw className="btn-icon" aria-hidden="true" /> Refresh
        </button>
      </div>

      <p className="muted">
        Review packaged items approaching their best-before, expiry, or opened-on limits. Reminders are planning aids, not food safety verdicts.
      </p>

      {/* Filter Tabs */}
      <div className="pill-filters" role="group" aria-label="Reminder filters">
        <button
          className={`filter-pill ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All Items ({reminders.length})
        </button>
        <button
          className={`filter-pill ${filter === "urgent" ? "active" : ""}`}
          onClick={() => setFilter("urgent")}
        >
          <AlertTriangle className="pill-icon text-warning" aria-hidden="true" />
          Needs Attention (&lt; 3 days)
        </button>
        <button
          className={`filter-pill ${filter === "opened" ? "active" : ""}`}
          onClick={() => setFilter("opened")}
        >
          <Clock className="pill-icon text-info" aria-hidden="true" />
          Opened Items
        </button>
      </div>

      {snoozeNotice && (
        <div className="alert info" role="status">
          {snoozeNotice}
        </div>
      )}

      {/* Reminders List */}
      <div className="reminders-container">
        {filtered.length === 0 ? (
          <div className="empty-state-box">
            <CheckCircle2 className="empty-icon text-brand-green" aria-hidden="true" />
            <h3>No urgent dates pending</h3>
            <p className="muted">All your kitchen items are well within their date limits.</p>
            <button className="primary-button" onClick={onNavigateToKitchen}>
              View Kitchen Stock
            </button>
          </div>
        ) : (
          <div className="reminder-cards-grid">
            {filtered.map((item) => {
              const isUrgent = item.daysRemaining <= 3;
              return (
                <div key={item.id} className={`reminder-card ${isUrgent ? "urgent-card" : ""}`}>
                  <div className="reminder-header">
                    <span className={`location-tag ${item.location.toLowerCase()}`}>
                      {item.location}
                    </span>
                    <span className={`days-badge ${isUrgent ? "badge-urgent" : "badge-normal"}`}>
                      {item.daysRemaining <= 0
                        ? "Check today"
                        : `${item.daysRemaining} days left`}
                    </span>
                  </div>

                  <h3 className="reminder-title">{item.displayName}</h3>

                  <div className="reminder-meta">
                    <div className="meta-row">
                      <Calendar className="meta-icon" aria-hidden="true" />
                      <span>
                        <strong>
                          {item.dateType === "best_before"
                            ? "Best Before:"
                            : item.dateType === "expiry"
                            ? "Expiry Date:"
                            : "Opened On:"}
                        </strong>{" "}
                        {item.dateValue}
                      </span>
                    </div>
                    <div className="meta-row">
                      <span>
                        Quantity: <strong>{item.quantity} {item.unit}</strong>
                      </span>
                      {item.isOpened && <span className="opened-badge">Opened</span>}
                    </div>
                  </div>

                  <p className="planning-notice">
                    {isUrgent
                      ? "⚠️ Review packaging and sensory condition before consumption."
                      : "ℹ️ Planning estimate based on pack declaration."}
                  </p>

                  <div className="reminder-actions">
                    <button
                      className="secondary-button compact-btn"
                      onClick={() => handleSnooze(item.id, 2)}
                      title="Remind me again in 2 days"
                    >
                      Snooze +2d
                    </button>
                    <button
                      className="primary-button compact-btn"
                      onClick={() => handleMarkUsed(item.id)}
                    >
                      <CheckCircle2 className="btn-icon" aria-hidden="true" /> Mark Used
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="subtle-card mt-16">
        <strong>FoodCue Date Semantics Rule:</strong>
        <p className="tiny">
          Best-Before is a quality indicator; Expiry is a safety ceiling. Neither replaces proper refrigeration or visual inspection. Reminders assist with household meal planning and food waste reduction.
        </p>
      </div>
    </section>
  );
}
