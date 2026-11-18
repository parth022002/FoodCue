# FoodCue Validation Protocol — Gate G1 Quantitative User Survey
**Gate:** G1 — Quantitative Problem & Market Hypothesis Validation  
**Protocol Code:** PROT-VAL-G1-QUANT-01  
**Authoritative Version:** 1.0  
**Survey Execution Window:** 25 October 2026 – 12 November 2026  
**Target Sample:** $N = 100$ Urban Indian Households  

---

## 1. Survey Objective & Hypotheses

This survey quantifies the prevalence, severity, and economic impact of household kitchen management problems in urban India, testing three primary hypotheses:

- **$H_1$ (Expiry & Waste):** $\ge 70\%$ of urban households discard unopened or partially consumed packaged food products at least once a month due to forgotten expiry dates.
- **$H_2$ (Duplicate Spend):** $\ge 60\%$ of households make duplicate grocery purchases due to lack of visibility into pantry contents before shopping.
- **$H_3$ (Label Distrust):** $\ge 75\%$ of consumers find packaged food labels in India misleading, difficult to read, or untrustworthy regarding sugar, palm oil, or allergen declarations.

---

## 2. Sample Design & Distribution

- **Total Valid Responses:** $N = 100$
- **Target Audience:** Urban residents in metro and tier 1 cities across India.
- **Collection Method:** Mobile-optimized online questionnaire distributed through community housing groups, culinary forums, and consumer consumer panels.
- **Incentive:** None (organic participation) to avoid mercenary bias.

### Stratification Matrix
- **Age:** 20–29 (38%), 30–39 (44%), 40–55 (18%)
- **City:** Delhi NCR (28%), Bengaluru (26%), Mumbai (22%), Hyderabad (14%), Pune (10%)
- **Household Type:** Single / Flatshare (24%), Nuclear family (52%), Joint / Multi-gen family (24%)

---

## 3. Survey Instrument (12 Structured Questions)

1. *How often do you order groceries or packaged food online or buy from a supermarket?*
   - Daily (8%) / 2–3 times a week (54%) / Once a week (28%) / Rarely (10%)
2. *In the last 30 days, did you throw away any packaged food because it passed its expiry or went bad?*
   - Yes, multiple items / Yes, one item / No / Don't remember
3. *What types of packaged foods get wasted most often in your kitchen? [Multi-select]*
   - Condiments & Sauces / Breads & Bakery / Dairy items / Snacks & Chips / Spices & Seasonings
4. *Estimated monthly financial loss from discarded expired groceries:*
   - Under ₹200 / ₹200–₹500 / ₹500–₹1,000 / Over ₹1,000
5. *How frequently do you buy an item only to realize you already had it at home?*
   - Very frequently (every week) / Often (2–3 times a month) / Occasionally (once a month) / Never
6. *When purchasing packaged foods, how often do you read the ingredients list?*
   - Always / Frequently / Only when trying a new brand / Rarely / Never
7. *Do you or anyone in your household have specific dietary allergies, intolerances, or health restrictions?*
   - Yes (Diabetic/Low-Sugar, Gluten, Lactose, Nut, High Blood Pressure/Sodium) / No
8. *How easy is it to understand health claims like "100% Real", "High Protein", or "Zero Added Sugar" on Indian packs?*
   - 5-point Likert scale (1 = Very Confusing/Misleading to 5 = Completely Clear & Honest)
9. *How do you currently keep track of items stored in your fridge and pantry?*
   - Mental memory only / WhatsApp notes / Paper list / No tracking
10. *Would you use a fast, offline mobile scanner that automatically extracts nutrition, allergens, and tracks kitchen inventory?*
    - Definitely would use / Probably would use / Might or might not / Unlikely
11. *Would you prefer an application that works 100% locally on your phone without demanding a phone number or cloud sign-in?*
    - Strongly prefer local/offline / Don't care / Prefer cloud-only
12. *What is the maximum time you would spend scanning a grocery haul of 10 items?*
    - Under 30 seconds / Under 1 minute / Under 2 minutes / Would not scan

---

## 4. Verification and Data Cleansing Rules

1. Drop speeder responses completed in $< 90$ seconds.
2. Drop straight-line responses on grid questions.
3. Validate geographic IP location to confirm urban India residency.
4. Export raw anonymized survey data for statistical verification.
