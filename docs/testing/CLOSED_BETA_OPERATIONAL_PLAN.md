# FoodCue — Closed Beta Operational Plan (10–20 Households)

**Document Version:** 2.1 (Authoritative Beta Plan)  
**Target Cohort:** 10–20 diverse Indian households (urban and semi-urban)  
**Duration:** 3 Weeks  
**Primary Goal:** Validate real-world kitchen grocery logging, barcode scanning success, multi-device household sharing, and expiration alerting prior to public marketing.

---

## 1. Beta Cohort Profiles

| Household ID | Type | Device Mix | Primary Grocery Pattern |
|---|---|---|---|
| **HH-01 to HH-05** | Nuclear Family (Parents + 1-2 kids) | Android (Samsung, OnePlus), iOS (iPhone) | Weekly supermarket haul + local kirana staples |
| **HH-06 to HH-10** | Young Working Couple | iOS, Android | Online quick-commerce (Blinkit, Zepto, Swiggy Instamart) |
| **HH-11 to HH-15** | Shared Flat / Roommates | Android, Web Desktop | Bulk snacking, shared grocery splitting |
| **HH-16 to HH-20** | Multi-Generational Household | Android (Xiaomi, Vivo) | High-volume fresh dairy, spices, traditional staples |

---

## 2. Three-Week Pilot Schedule

### Week 1: Onboarding, Scanning & Setup
- Distribute onboarding instructions and guide participants to install FoodCue PWA via *"Add to Home Screen"*.
- Ask participants to scan 5–10 packaged items from their pantry/fridge.
- Target: Test barcode scanning speed, camera controls, and local health score comprehension.

### Week 2: Household Sharing & Shopping Lists
- Assist households in inviting at least one family member or roommate into a shared Household.
- Test collaborative pantry updates: adding grocery items, logging consumption, and adding items to the replenishment shopping list.
- Target: Verify multi-device synchronization and conflict-free concurrent editing.

### Week 3: Expiration Alerts & Avoid-List Warnings
- Participants configure dietary avoid-lists (e.g. allergies, vegan, sugar preferences).
- Enable Web Push notifications for items nearing expiration.
- Target: Validate proactive alert deliverability and zero false-safe allergen clearances.

---

## 3. Success Metrics & Exit KPIs (Gate P8 Sign-Off)

To pass Release Gate P8, the closed beta must achieve:
1. **Barcode Scan Success Rate:** $\ge 95\%$ on physical Indian FMCG packages.
2. **Crash / Data Loss Rate:** $0$ critical data corruption or lost inventory incidents.
3. **User Satisfaction Score (CSAT):** $\ge 4.2 / 5.0$ across weekly feedback surveys.
4. **Push Alert Delivery:** $\ge 90\%$ delivery success on supported Android/Desktop devices.

---

## 4. Participant Communication Templates

### 4.1 Welcome Email / WhatsApp Invitation
```text
Hi [Name],

You are invited to participate in the private beta of FoodCue — a modern, privacy-first web application designed to help you know exactly what is in your packaged food and manage your kitchen pantry effortlessly!

How to get started:
1. Open https://[your-domain] on your smartphone in Chrome (Android) or Safari (iPhone).
2. Tap the browser menu and select "Add to Home Screen" to install it as an app.
3. Try scanning 3-5 packaged food items in your kitchen!

All features run directly on your phone with complete privacy. Please reply with any feedback, questions, or product suggestions. Thank you for helping us build FoodCue!
```
