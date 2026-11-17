/**
 * FoodCue Physical Packaging Benchmark Data Entry & Validation Tool
 * Phase 11.4 Real-World Food Packaging Validation
 *
 * Allows logging and evaluating real physical packaging photographs against
 * ground-truth FSSAI labels using the deterministic packBenchmarkEvaluator.
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import {
  computeCer,
  computeWer,
  evaluateBenchmarkPack
} from "../src/domain/services/packBenchmarkEvaluator.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data", "physical-packs");

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const benchmarkFilePath = path.join(dataDir, "benchmark-records.json");

function loadExistingRecords() {
  if (fs.existsSync(benchmarkFilePath)) {
    try {
      return JSON.parse(fs.readFileSync(benchmarkFilePath, "utf8"));
    } catch {
      return [];
    }
  }
  return [];
}

function saveRecords(records) {
  fs.writeFileSync(benchmarkFilePath, JSON.stringify(records, null, 2), "utf8");
}

console.log("================================================================================");
console.log("            FOODCUE PHYSICAL PACKAGING BENCHMARK VALIDATOR                     ");
console.log("================================================================================");

const existing = loadExistingRecords();
console.log(`Loaded ${existing.length} existing physical pack validation records.`);

// Summary of 10 Categories
const categories = [
  "1. Dairy products",
  "2. Biscuits and bakery",
  "3. Snacks",
  "4. Instant food",
  "5. Breakfast cereals",
  "6. Beverages",
  "7. Edible oils",
  "8. Spices",
  "9. Packaged staples",
  "10. Sweets and confectionery"
];

console.log("\nTarget Evaluation Categories:");
categories.forEach((c) => console.log("  " + c));
console.log("\nBenchmark storage directory: data/physical-packs/");
console.log("Data schema template available in docs/validation/PACK_BENCHMARK_ANNOTATION_GUIDE.md\n");

// Export quick validation summary if records exist
if (existing.length > 0) {
  let matchedBarcodes = 0;
  let totalCer = 0;
  let totalWer = 0;
  existing.forEach((r) => {
    if (r.observed?.decodedBarcode === r.expected?.barcodeValue) matchedBarcodes++;
    if (r.expected?.ingredientsText && r.observed?.ocrRawText) {
      totalCer += computeCer(r.expected.ingredientsText, r.observed.ocrRawText);
      totalWer += computeWer(r.expected.ingredientsText, r.observed.ocrRawText);
    }
  });

  console.log("Current Physical Benchmark Metrics:");
  console.log(`- Total Annotated Packs: ${existing.length}`);
  console.log(`- Barcode Scan Accuracy: ${((matchedBarcodes / existing.length) * 100).toFixed(1)}%`);
  console.log(`- Mean Character Error Rate (CER): ${(totalCer / existing.length).toFixed(3)}`);
  console.log(`- Mean Word Error Rate (WER): ${(totalWer / existing.length).toFixed(3)}`);
} else {
  console.log("No physical pack photo annotations recorded yet. Please capture packaging photos");
  console.log("and record ground truth entries using the template defined in PHASE_11_REAL_WORLD_PACKAGING_VALIDATION.md.");
}
console.log("================================================================================\n");
