# FoodCue — Phase 11.7 Closed Beta Operational Plan (10–20 Households)

**Program:** FoodCue Household Closed Beta  
**Target Cohort:** 10–20 Indian households (Diverse demographics, families with children, seniors, individuals with allergies)  
**Program Duration:** 3 Weeks  
**Baseline Principle:** Real empirical user feedback; zero fabricated survey results.

---

## 1. 10 Core Beta Key Performance Indicators (KPIs)

The following metrics must be tracked across the closed beta cohort:

| # | KPI Name | Mathematical Formula | Target Success Benchmark |
| :---: | :--- | :--- | :--- |
| **1** | **Successful Barcode Scans** | $\frac{\text{Successful Scans}}{\text{Total Scan Attempts}} \times 100$ | $\ge 95.0\%$ across all lighting conditions |
| **2** | **Product Identification Accuracy** | $\frac{\text{Correct Product Matches}}{\text{Total Scanned Products}} \times 100$ | $\ge 98.0\%$ on Indian FMCG products |
| **3** | **Nutrition Data Completeness** | $\frac{\text{Available Nutrient Fields}}{\text{18 Expected Mandatory Fields}} \times 100$ | $\ge 85.0\%$ on verified packaged foods |
| **4** | **Scan Completion Time** | Average seconds from viewfinder opening to confirmed card | $\le 3.5\text{ seconds}$ on 4G / Wi-Fi |
| **5** | **Search Success Rate** | $\frac{\text{Queries with } \ge 1 \text{ relevant product}}{\text{Total Search Queries}} \times 100$ | $\ge 92.0\%$ for branded FMCG keywords |
| **6** | **Catalogue Adoption** | Average saved products per active household | $\ge 15\text{ products/user}$ after 14 days |
| **7** | **User Retention** | $\frac{\text{Active Users at Day 14}}{\text{Onboarded Users at Day 1}} \times 100$ | $\ge 70.0\%$ weekly active retention |
| **8** | **Allergy Warning Accuracy** | $\frac{\text{Verified Conflict Warnings}}{\text{Total Packaged Items with User Allergens}} \times 100$ | **100.0% (Zero missed declared allergens)** |
| **9** | **User Satisfaction Score (CSAT)** | Average rating on 1–5 scale from weekly surveys | $\ge 4.2 / 5.0$ |
| **10**| **Critical Application Failures** | Confirmed data loss, UI freeze, or security crashes | **0 Critical Failures** |

---

## 2. Nine Complete Operational Beta Artifacts

### Artifact 1: Beta Participant Invitation Template
```
Subject: Exclusive Invitation: Try FoodCue to simplify your kitchen & food shopping!

Hi [Name],

We are excited to invite your household to participate in the exclusive 3-week Closed Beta of FoodCue!

What is FoodCue?
FoodCue is a fast, privacy-first mobile web app designed for Indian families:
• Scan any packaged food barcode or label to see instant nutritional scores and decoded ingredients.
• Set your family's allergies (Milk, Gluten, Nuts, etc.) to get instant safety warnings.
• Track your kitchen groceries and receive alerts before food expires.

As a beta participant:
1. You'll get early access via your phone browser (no app store download required).
2. You'll help shape a product built for Indian households.
3. You will receive a ₹500 grocery voucher upon completing the 3-week feedback program.

Interested? Reply to this email with "YES" and we'll send your private onboarding link!

Best regards,
The FoodCue Team
```

---

### Artifact 2: Participant Onboarding Guide
1. **Accessing the App:** Open Safari (iOS) or Chrome (Android) and navigate to `https://foodcue.vercel.app`.
2. **Add to Home Screen (PWA):**
   - *Android:* Tap the three-dot menu -> **Add to Home screen** / **Install app**.
   - *iOS:* Tap the Share button -> **Add to Home Screen**.
3. **Account Creation:** Tap **Sign In**, enter your email, and input the 6-digit verification code.
4. **Setting Up Your Family Profile:**
   - Tap **Profile / Settings**.
   - Select any allergies or ingredients your household avoids (e.g., Peanuts, Lactose, Gluten, Excess Sugar).
   - Set dietary preference (Vegetarian, Vegan, Standard).

---

### Artifact 3: User Testing Task Instructions
During your 3-week beta, please complete these 4 weekly activities:
- **Activity A (Shopping & Scanning):** Scan at least 5 different food packages in your kitchen or at the store.
- **Activity B (Food Search):** Search for 3 branded foods (e.g., Amul, Maggi, Tata Salt) using the search tab.
- **Activity C (My Catalogue):** Save your family's favorite 5 products to your private catalogue.
- **Activity D (Kitchen Management):** Add 3 grocery items with expiry dates to your kitchen inventory.

---

### Artifact 4: Weekly Feedback Questionnaire
1. How easy was it to scan barcodes using your phone camera? (1: Very Difficult — 5: Very Easy)
2. Did the health score and ingredient explanations make sense to your family? (Yes / Somewhat / No)
3. Did the app accurately detect any allergens you set in your profile? (Yes / No / Did not test)
4. Did you experience any crashes, camera freezes, or error messages? (If yes, please describe)
5. What is one feature you wish FoodCue had?

---

### Artifact 5: Bug Reporting Template
- **Participant ID:** `HH-[Number]`
- **Date & Time:** `YYYY-MM-DD HH:MM`
- **Device Model & OS:** (e.g., Samsung Galaxy S21, Android 14 / iPhone 13, iOS 17)
- **Browser:** (Chrome / Safari / Edge)
- **What product were you scanning/searching?** (e.g., Parle-G 250g)
- **What happened?** (e.g., Camera showed black screen / Product not found)
- **What did you expect to happen?**
- **Screenshot / Video:** (Attach if available)

---

### Artifact 6: Weekly Feedback Tracking Sheet Schema
Columns for logging participant feedback in spreadsheet:
`Household_ID | Week_Number | Device_Type | Scans_Logged | Searches_Logged | Pantry_Items_Added | Crashes_Reported | CSAT_Rating | Notes_And_Suggestions`

---

### Artifact 7: Beta Performance Dashboard Specification
A simple internal status view tracking:
- Total registered beta users.
- Daily active users (DAU) and Weekly active users (WAU).
- Error log aggregation from serverless API endpoints (`/api/sync/*`, `/api/webhooks/clerk`).
- Distribution of scanned categories.

---

### Artifact 8: Privacy & Informed Consent Information
- **Data Privacy Assurance:** FoodCue does NOT record or upload video frames or face images. Camera feeds are processed in device memory to locate barcodes and are immediately cleared.
- **Voluntary Participation:** Participants may opt out at any time.
- **Account Deletion:** Users can delete all cloud data with one click in the app settings.

---

### Artifact 9: Beta Exit Questionnaire
1. Overall, how would you rate your experience with FoodCue over the last 3 weeks? (1 to 5 Stars)
2. How disappointed would you be if you could no longer use FoodCue? (Very disappointed / Somewhat disappointed / Not disappointed)
3. Which feature did your household find most valuable? (Scanner / Expiry Reminders / Health Score / Allergy Guard)
4. Would you recommend FoodCue to friends or family? (Net Promoter Score: 0 to 10)
5. Any final thoughts for the development team?
