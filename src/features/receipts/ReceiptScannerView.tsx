import React, { useState, useRef } from "react";
import {
  Receipt,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Plus,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Store,
  DollarSign,
  ArrowRight,
  FileText,
  RotateCcw
} from "lucide-react";
import type { ParsedReceipt, ReceiptLineItem } from "../../domain/entities/receipt";
import { parseSupermarketReceiptText } from "../../domain/services/receiptParser";
import { appendPantryEvent } from "../../domain/services/pantryLedger";
import { putRecord, getAllRecords } from "../../adapters/storage/database";
import type { PantryEvent } from "../../domain/entities/pantry";
import { useTranslation } from "../../i18n";

const SAMPLE_INDIAN_RECEIPT_TEXT = `
RELIANCE RETAIL LIMITED
RELIANCE SMART POINT - POWAI
GSTIN: 27AABCR1234F1Z8
BILL NO: RETAIL-2026-9812
DATE: 18/11/2026  TIME: 14:32

ITEM DESCRIPTION       QTY   RATE   AMOUNT
------------------------------------------
AMUL TAAZA MILK 1L      2   58.00   116.00
AASHIRVAAD ATTA 5KG     1  245.00   245.00
TATA SALT IODISED 1KG   1   28.00    28.00
FORTUNE SUNFLOWER OIL   1  145.00   145.00
AMUL MALAI PANEER 200G  1   95.00    95.00
BRITANNIA 100% WHEAT    1   45.00    45.00
MAGGI 2-MIN NOODLES     1   70.00    70.00
------------------------------------------
SUB TOTAL:                         744.00
CGST 2.5%:                          18.60
SGST 2.5%:                          18.60
GRAND TOTAL:                       781.20
PAID VIA: UPI REF: 9812374198234
THANK YOU FOR SHOPPING AT RELIANCE!
`;

export function ReceiptScannerView({
  onItemsAddedToKitchen
}: {
  onItemsAddedToKitchen?: () => void;
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rawText, setRawText] = useState("");
  const [parsedReceipt, setParsedReceipt] = useState<ParsedReceipt | null>(null);
  const [items, setItems] = useState<ReceiptLineItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewImage(reader.result as string);
      processReceiptFile(file);
    };
    reader.readAsDataURL(file);
  }

  function processReceiptFile(_file: File) {
    setIsProcessing(true);
    setErrorMessage("");

    // Simulate fast OCR extraction (or user text upload)
    setTimeout(() => {
      // In web environment, if no direct OCR image is passed or if testing with a sample, parse text
      const parsed = parseSupermarketReceiptText(rawText || SAMPLE_INDIAN_RECEIPT_TEXT);
      setParsedReceipt(parsed);
      setItems(parsed.items);
      setIsProcessing(false);
    }, 800);
  }

  function handleParseCustomText() {
    if (!rawText.trim()) {
      setErrorMessage("Please paste receipt text or upload an image.");
      return;
    }
    setIsProcessing(true);
    setErrorMessage("");

    setTimeout(() => {
      const parsed = parseSupermarketReceiptText(rawText);
      setParsedReceipt(parsed);
      setItems(parsed.items);
      setIsProcessing(false);
    }, 400);
  }

  function handleLoadSampleBill() {
    setRawText(SAMPLE_INDIAN_RECEIPT_TEXT);
    setIsProcessing(true);
    setErrorMessage("");

    setTimeout(() => {
      const parsed = parseSupermarketReceiptText(SAMPLE_INDIAN_RECEIPT_TEXT);
      setParsedReceipt(parsed);
      setItems(parsed.items);
      setIsProcessing(false);
    }, 400);
  }

  function handleUpdateItem(index: number, updates: Partial<ReceiptLineItem>) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, ...updates } : it))
    );
  }

  function handleRemoveItem(index: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  }

  function handleAddNewBlankItem() {
    const defaultDate = (new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0]) ?? "";
    const newItem: ReceiptLineItem = {
      id: `manual_item_${Date.now()}`,
      name: "",
      quantity: 1,
      unit: "pack",
      unitPrice: 0,
      totalPrice: 0,
      location: "Pantry",
      shelfLifeDays: 14,
      expiryDate: defaultDate
    };
    setItems((prev) => [...prev, newItem]);
  }

  async function handleConfirmAndSaveToKitchen() {
    if (items.length === 0) {
      setErrorMessage("No items to add. Please add at least one valid item.");
      return;
    }

    const invalid = items.some((it) => !it.name.trim() || it.quantity <= 0);
    if (invalid) {
      setErrorMessage("Please ensure all items have a valid name and positive quantity.");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    try {
      let ledger = (await getAllRecords("pantryEvents")) as PantryEvent[];

      for (const item of items) {
        const event: PantryEvent = {
          eventId: `evt_receipt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          itemId: item.name.trim(),
          eventType: "add",
          quantityDelta: item.quantity,
          unit: item.unit,
          location: item.location.toLowerCase() as "pantry" | "fridge" | "freezer",
          occurredAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          confirmation: true, // Invariant 1: Mandatory explicit user confirmation
          dateType: "expiry",
          dateValue: item.expiryDate,
          source: "import",
          schemaVersion: 1
        };

        ledger = appendPantryEvent(event, ledger);
        await putRecord("pantryEvents", event);
      }

      setSuccessMessage(
        `Successfully added ${items.length} items from ${parsedReceipt?.storeName || "Receipt"} to your kitchen inventory!`
      );
      setParsedReceipt(null);
      setItems([]);
      setPreviewImage(null);
      setRawText("");
      setIsProcessing(false);

      if (onItemsAddedToKitchen) {
        setTimeout(onItemsAddedToKitchen, 1800);
      }
    } catch (err: unknown) {
      setIsProcessing(false);
      setErrorMessage((err as Error).message || "Failed to save items to kitchen inventory.");
    }
  }

  function handleReset() {
    setParsedReceipt(null);
    setItems([]);
    setPreviewImage(null);
    setRawText("");
    setErrorMessage("");
    setSuccessMessage("");
  }

  return (
    <div className="receipt-scanner-feature-root" aria-labelledby="receipt-scanner-title">
      {/* Header */}
      <div className="panel-header-block mb-4">
        <div className="flex items-center gap-3">
          <div className="header-icon-box bg-blue-100 text-blue-800 p-2 rounded-lg">
            <Receipt size={24} aria-hidden="true" />
          </div>
          <div>
            <p className="section-eyebrow">AUTOMATED KITCHEN RESTOCKING</p>
            <h1 id="receipt-scanner-title" className="text-2xl font-bold text-gray-900">
              {t.receipts.title}
            </h1>
          </div>
        </div>
        <p className="text-gray-600 mt-2 text-sm leading-relaxed max-w-3xl">
          {t.receipts.subtitle}
        </p>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg mb-6 flex items-center justify-between" role="status">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-emerald-600" />
            <strong className="text-sm">{successMessage}</strong>
          </div>
          {onItemsAddedToKitchen && (
            <button
              type="button"
              className="text-xs font-semibold text-emerald-700 underline hover:text-emerald-950 flex items-center gap-1"
              onClick={onItemsAddedToKitchen}
            >
              Open My Kitchen <ArrowRight size={14} />
            </button>
          )}
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg mb-6 flex items-center gap-2" role="alert">
          <AlertCircle size={20} className="text-rose-600 shrink-0" />
          <span className="text-sm">{errorMessage}</span>
        </div>
      )}

      {/* Upload & Capture Step (If not currently in review mode) */}
      {!parsedReceipt && (
        <div className="upload-container panel p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Left: Drag and Drop Upload Card */}
            <div
              className="receipt-dropzone border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-emerald-500 transition cursor-pointer bg-gray-50/50"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewImage ? (
                <div className="mb-3">
                  <img src={previewImage} alt="Receipt preview" className="max-h-32 mx-auto rounded shadow-sm border" />
                  <span className="text-xs text-emerald-700 font-semibold block mt-1">Receipt Image Loaded</span>
                </div>
              ) : (
                <UploadCloud size={48} className="mx-auto text-emerald-600 mb-3" />
              )}
              <h3 className="text-base font-bold text-gray-800 mb-1">{t.receipts.uploadBill}</h3>
              <p className="text-xs text-gray-500 mb-4">{t.receipts.uploadInstructions}</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                aria-label="Upload supermarket receipt image"
              />
              <button
                type="button"
                className="px-4 py-2 bg-emerald-600 text-white rounded font-medium text-xs hover:bg-emerald-700 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Browse Receipt File
              </button>
            </div>

            {/* Right: Digital Text / Sample Indian Bill */}
            <div className="text-upload-column bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <FileText size={16} className="text-emerald-600" />
                  Paste Bill Text or Try Sample
                </h4>
                <button
                  type="button"
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline"
                  onClick={handleLoadSampleBill}
                >
                  Load Reliance Bill Sample
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Paste receipt text from an SMS, email invoice, or digital receipt (Reliance, DMart, Blinkit, BigBasket).
              </p>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste supermarket receipt text here..."
                className="w-full h-32 p-3 text-xs font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                aria-label="Paste receipt text"
              />
              <button
                type="button"
                className="w-full mt-3 py-2 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-black transition flex items-center justify-center gap-2"
                onClick={handleParseCustomText}
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Extract Purchased Groceries"}
              </button>
            </div>
          </div>

          {/* Privacy Guarantee Footer */}
          <div className="mt-6 flex items-start gap-2.5 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600">
            <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <p>
              <strong>Privacy Assurance:</strong> {t.receipts.zeroRetentionGuarantee}
            </p>
          </div>
        </div>
      )}

      {/* Mandatory Review & Edit Table Step */}
      {parsedReceipt && (
        <div className="review-container panel p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="review-header flex flex-wrap items-center justify-between gap-4 border-b pb-4 mb-4">
            <div>
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                STEP 2: MANDATORY VERIFICATION BEFORE INVENTORY IMPORT
              </span>
              <h2 className="text-xl font-bold text-gray-900 mt-1">
                {t.receipts.reviewTitle}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {t.receipts.reviewSubtitle}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="px-3 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded hover:bg-gray-50 transition flex items-center gap-1.5"
                onClick={handleReset}
              >
                <RotateCcw size={14} /> {t.receipts.cancelReview}
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 transition flex items-center gap-1.5 shadow"
                onClick={handleConfirmAndSaveToKitchen}
                disabled={isProcessing}
              >
                <CheckCircle2 size={16} />
                {isProcessing ? "Saving..." : t.receipts.confirmAndAdd} ({items.length})
              </button>
            </div>
          </div>

          {/* Receipt Store Meta Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs text-gray-600">
            <div>
              <span className="text-gray-400 block flex items-center gap-1">
                <Store size={12} /> {t.receipts.storeName}
              </span>
              <strong className="text-gray-800 text-sm">{parsedReceipt.storeName}</strong>
            </div>
            <div>
              <span className="text-gray-400 block flex items-center gap-1">
                <Calendar size={12} /> {t.receipts.purchaseDate}
              </span>
              <strong className="text-gray-800 text-sm">{parsedReceipt.purchaseDate}</strong>
            </div>
            <div>
              <span className="text-gray-400 block">Extracted Items</span>
              <strong className="text-gray-800 text-sm">{items.length} groceries</strong>
            </div>
            <div>
              <span className="text-gray-400 block flex items-center gap-1">
                <DollarSign size={12} /> {t.receipts.grandTotal}
              </span>
              <strong className="text-emerald-700 text-sm">₹{parsedReceipt.grandTotal?.toFixed(2)}</strong>
            </div>
          </div>

          {/* Extracted Items Table */}
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-left text-xs text-gray-700">
              <thead className="bg-gray-100 text-gray-600 font-semibold uppercase text-[11px] border-b">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">{t.receipts.colItem}</th>
                  <th className="p-3 w-28">{t.receipts.colQty}</th>
                  <th className="p-3 w-24">{t.receipts.colPrice}</th>
                  <th className="p-3 w-32">{t.receipts.colLocation}</th>
                  <th className="p-3 w-36">Estimated Expiry</th>
                  <th className="p-3 text-center w-16">{t.receipts.colAction}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="p-3 text-gray-400 font-mono">{idx + 1}</td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(idx, { name: e.target.value })}
                        className="w-full p-1.5 border border-gray-300 rounded font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        aria-label={`Product name for item ${idx + 1}`}
                      />
                    </td>
                    <td className="p-3 flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(idx, { quantity: parseInt(e.target.value, 10) || 1 })}
                        className="w-12 p-1.5 border border-gray-300 rounded text-center"
                        aria-label="Quantity"
                      />
                      <select
                        value={item.unit}
                        onChange={(e) => handleUpdateItem(idx, { unit: e.target.value })}
                        className="p-1.5 border border-gray-300 rounded"
                        aria-label="Unit"
                      >
                        <option value="pack">pack</option>
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                        <option value="ml">ml</option>
                        <option value="pcs">pcs</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.5"
                        value={item.totalPrice || 0}
                        onChange={(e) => handleUpdateItem(idx, { totalPrice: parseFloat(e.target.value) || 0 })}
                        className="w-20 p-1.5 border border-gray-300 rounded text-right font-mono"
                        aria-label="Price"
                      />
                    </td>
                    <td className="p-3">
                      <select
                        value={item.location}
                        onChange={(e) =>
                          handleUpdateItem(idx, {
                            location: e.target.value as "Pantry" | "Fridge" | "Freezer"
                          })
                        }
                        className="w-full p-1.5 border border-gray-300 rounded font-medium"
                        aria-label="Storage location"
                      >
                        <option value="Pantry">Pantry</option>
                        <option value="Fridge">Fridge</option>
                        <option value="Freezer">Freezer</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="date"
                        value={item.expiryDate}
                        onChange={(e) => handleUpdateItem(idx, { expiryDate: e.target.value })}
                        className="w-full p-1.5 border border-gray-300 rounded text-xs"
                        aria-label="Expiry date"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        className="text-gray-400 hover:text-rose-600 transition p-1"
                        onClick={() => handleRemoveItem(idx)}
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Blank Item Row Button */}
          <div className="mt-3 flex justify-between items-center">
            <button
              type="button"
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1.5 p-2 rounded hover:bg-emerald-50 transition"
              onClick={handleAddNewBlankItem}
            >
              <Plus size={14} /> Add Another Item Manually
            </button>

            <span className="text-xs text-gray-400">
              {items.length} items verified
            </span>
          </div>

          {/* Bottom Confirmation Bar */}
          <div className="mt-6 pt-4 border-t flex justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded hover:bg-gray-50 transition"
              onClick={handleReset}
            >
              Cancel
            </button>
            <button
              type="button"
              className="px-6 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 transition flex items-center gap-2 shadow"
              onClick={handleConfirmAndSaveToKitchen}
              disabled={isProcessing}
            >
              <CheckCircle2 size={16} />
              Confirm & Add All Items to Kitchen Inventory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
