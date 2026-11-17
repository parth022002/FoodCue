# FoodCue — OpenFoodFacts Feature User Guide
**Audience:** End Users, Beta Testers, Field Researchers & Quality Auditors  
**Document Version:** 1.0.0  
**Status:** PUBLISHED  
**Date:** November 2026  

---

## 1. What is OpenFoodFacts Fallback in FoodCue?

When you scan a packaged food product in FoodCue using your camera or enter its barcode number, FoodCue first checks its internal catalogue of verified Indian grocery items.

If an item is not found in the local catalogue (for example, an imported snack, a regional specialty item, or a brand-new product), FoodCue gives you the option to query **OpenFoodFacts**, an open global database of packaged food products.

This feature is **100% optional** and requires your explicit click.

---

## 2. Privacy & Safety Guarantees

Before you click *"Search OpenFoodFacts"*, you can be confident that:
- **Zero Personal Data is Shared:** Only the barcode number (the series of numbers printed below the stripes) is transmitted.
- **No Photos or Camera Images Leave Your Device:** All barcode decoding and text recognition happen right inside your browser on your device.
- **Your Pantry is Private:** OpenFoodFacts has no visibility into who you are, what else is in your kitchen, or your dietary preferences.
- **Physical Verification is Mandatory:** Crowdsourced databases can contain outdated formulations or regional variations. FoodCue will never add an item to your pantry until you inspect your physical pack and confirm the brand, ingredients, and allergen panel yourself.

---

## 3. Step-by-Step Instructions

### Step 1: Scan or Enter Barcode
1. Open FoodCue and navigate to **SmartScan** in the navigation bar.
2. Scan the barcode using your device camera, upload a photo of the barcode, or enter the numbers manually in the text box.
3. If the item is in FoodCue's local catalogue, the verified candidate appears immediately.

### Step 2: Review "No Local Match" Notice
1. If the item is not in the local catalogue, you will see a card titled:
   `No Match in Local Verified Indian Catalogue`.
2. Below the title, you will see the OpenFoodFacts fallback card with an explanation and privacy guarantee.

### Step 3: Search OpenFoodFacts
1. Click the green button: **"Search OpenFoodFacts"**.
2. FoodCue will send a secure lookup to the OpenFoodFacts API.
3. Within 1–2 seconds, the product title, brand, declared ingredients, and nutrition facts will load into your scan review screen.

### Step 4: Verify the Physical Pack (Mandatory Safety Step)
1. You will see an amber banner: `External OpenFoodFacts Metadata (Unverified)`.
2. Look at the physical pack in your hands:
   - Check the product name and brand.
   - Check the ingredients list on the packaging.
   - Verify whether any allergen warnings (e.g. contains milk, wheat, nuts) match what is printed on your physical pack.
3. Check the box: **"I have physically reviewed the pack"**.
4. Click **"I Confirm This Physical Pack"**.

### Step 5: Save to Your Kitchen Ledger
1. The deterministic Food Intelligence engine will analyze the confirmed label against FSSAI dietary and allergen standards.
2. Select your storage location (Pantry, Fridge, or Freezer) and quantity, then click **"Add to Kitchen"**.
3. The confirmed item is now saved to your offline pantry ledger!

---

## 4. Frequently Asked Questions (FAQ)

### What if OpenFoodFacts does not have my product either?
If the product is not in OpenFoodFacts, you will see a message: *"Product not found in OpenFoodFacts database"*. You can simply click **"Enter Pack Details Manually"** to type in the name and confirm the physical pack yourself.

### Does FoodCue work when I have no internet connection?
Yes! FoodCue is an offline-first application. The local catalogue of verified Indian items works 100% offline. The OpenFoodFacts fallback requires an active internet connection, but if you are offline, you can always enter items manually.

### Why do I have to physically inspect the packaging?
Food manufacturers frequently update their formulations, change cooking oils, or move to shared factory equipment without altering the barcode. A database entry could reflect an older formulation. For your health and safety—especially regarding food allergies—confirming the physical pack in your hands is the only true guarantee.
