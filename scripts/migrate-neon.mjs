// Complete Production Schema Migration & Seeding for Neon Lakebase Postgres
import { neon } from "@neondatabase/serverless";

const databaseUrl =
  process.env.NEON_DATABASE_URL_UNPOOLED ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.VITE_NEON_DATABASE_URL ||
  "postgresql://neondb_owner:npg_cKRineBy5q8d@ep-snowy-mode-b3jn52y5.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

console.log("Connecting to Neon Postgres...");
const sql = neon(databaseUrl);

async function runMigration() {
  console.log("Running complete FoodCue database schema migration...");

  // 1. Users & Device Sessions
  await sql`
    CREATE TABLE IF NOT EXISTS foodcue_users (
      user_id VARCHAR(64) PRIMARY KEY,
      clerk_id VARCHAR(128) UNIQUE,
      email VARCHAR(255),
      display_name VARCHAR(128),
      is_anonymous BOOLEAN DEFAULT TRUE,
      device_fingerprint VARCHAR(128),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✓ Table foodcue_users ready");

  // 2. User Profiles & Avoid-Lists
  await sql`
    CREATE TABLE IF NOT EXISTS foodcue_profiles (
      profile_id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) REFERENCES foodcue_users(user_id) ON DELETE CASCADE,
      allergens_to_avoid TEXT[] DEFAULT '{}',
      ingredients_to_avoid TEXT[] DEFAULT '{}',
      dietary_preference VARCHAR(64) DEFAULT 'standard',
      calm_mode BOOLEAN DEFAULT FALSE,
      theme VARCHAR(16) DEFAULT 'system',
      emergency_contact_number VARCHAR(32) DEFAULT '112',
      enable_cloud_backup BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✓ Table foodcue_profiles ready");

  // 3. Master Verified Packaged Food Catalog
  await sql`
    CREATE TABLE IF NOT EXISTS foodcue_catalog (
      catalog_id VARCHAR(64) PRIMARY KEY,
      gtin VARCHAR(14) UNIQUE NOT NULL,
      brand VARCHAR(128) NOT NULL,
      product_name VARCHAR(256) NOT NULL,
      variant VARCHAR(128),
      pack_size VARCHAR(64),
      category VARCHAR(64),
      fssai_licence VARCHAR(32),
      ingredients_text TEXT NOT NULL,
      allergen_declaration TEXT,
      cross_contact_statement TEXT,
      serving_size VARCHAR(64),
      servings_per_pack NUMERIC(6, 2),
      nutrition_facts JSONB NOT NULL DEFAULT '{}'::jsonb,
      ins_additives TEXT[] DEFAULT '{}',
      image_front_url TEXT,
      image_back_url TEXT,
      verified BOOLEAN DEFAULT TRUE,
      verified_by VARCHAR(64) DEFAULT 'curator',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✓ Table foodcue_catalog ready");

  // 4. Confirmed Labels (Physical Pack Verifications)
  await sql`
    CREATE TABLE IF NOT EXISTS foodcue_confirmed_labels (
      label_id VARCHAR(64) PRIMARY KEY,
      candidate_id VARCHAR(64) NOT NULL,
      gtin VARCHAR(14),
      user_id VARCHAR(64),
      physical_identity VARCHAR(256) NOT NULL,
      label_version VARCHAR(128) NOT NULL,
      lot_number VARCHAR(64),
      date_marking_type VARCHAR(32),
      date_marking_value VARCHAR(64),
      panels JSONB NOT NULL DEFAULT '{}'::jsonb,
      raw_ocr_evidence JSONB DEFAULT '{}'::jsonb,
      field_states JSONB NOT NULL DEFAULT '{}'::jsonb,
      content_hash VARCHAR(64),
      confirmed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      synced_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✓ Table foodcue_confirmed_labels ready");

  // 5. Kitchen / Pantry Items (Current Projected State)
  await sql`
    CREATE TABLE IF NOT EXISTS foodcue_pantry_items (
      item_id VARCHAR(128) PRIMARY KEY,
      user_id VARCHAR(64) DEFAULT 'local-user',
      catalog_id VARCHAR(64) REFERENCES foodcue_catalog(catalog_id) ON DELETE SET NULL,
      gtin VARCHAR(14),
      product_name VARCHAR(256) NOT NULL,
      brand VARCHAR(128),
      current_quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
      unit VARCHAR(32) NOT NULL DEFAULT 'pack',
      location VARCHAR(32) NOT NULL DEFAULT 'pantry',
      storage_condition VARCHAR(64) DEFAULT 'ambient',
      lot_number VARCHAR(64),
      date_type VARCHAR(32) DEFAULT 'best_before',
      date_value VARCHAR(64),
      opened_at TIMESTAMPTZ,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✓ Table foodcue_pantry_items ready");

  // 6. Pantry Event Ledger (Append-Only)
  await sql`
    CREATE TABLE IF NOT EXISTS foodcue_pantry_events (
      event_id VARCHAR(64) PRIMARY KEY,
      item_id VARCHAR(128) NOT NULL,
      user_id VARCHAR(64) DEFAULT 'local-user',
      event_type VARCHAR(32) NOT NULL,
      quantity_delta NUMERIC(10, 2) NOT NULL,
      unit VARCHAR(32) NOT NULL DEFAULT 'pack',
      location VARCHAR(32),
      date_type VARCHAR(32),
      date_value VARCHAR(64),
      note TEXT,
      compensating_event_id VARCHAR(64),
      source VARCHAR(32) DEFAULT 'user_action',
      occurred_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✓ Table foodcue_pantry_events ready");

  // 7. Date Tracking & Reminders
  await sql`
    CREATE TABLE IF NOT EXISTS foodcue_reminders (
      reminder_id VARCHAR(64) PRIMARY KEY,
      item_id VARCHAR(128) NOT NULL,
      user_id VARCHAR(64) DEFAULT 'local-user',
      title VARCHAR(256) NOT NULL,
      reminder_type VARCHAR(32) NOT NULL DEFAULT 'expiry',
      target_date TIMESTAMPTZ NOT NULL,
      snooze_count INTEGER DEFAULT 0,
      last_snoozed_at TIMESTAMPTZ,
      status VARCHAR(32) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✓ Table foodcue_reminders ready");

  // 8. Shopping List
  await sql`
    CREATE TABLE IF NOT EXISTS foodcue_shopping_list (
      list_item_id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) DEFAULT 'local-user',
      gtin VARCHAR(14),
      product_name VARCHAR(256) NOT NULL,
      brand VARCHAR(128),
      category VARCHAR(64) DEFAULT 'General',
      requested_quantity NUMERIC(10, 2) DEFAULT 1.00,
      unit VARCHAR(32) DEFAULT 'pack',
      checked BOOLEAN DEFAULT FALSE,
      source VARCHAR(32) DEFAULT 'manual',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✓ Table foodcue_shopping_list ready");

  // 9. Intelligence Rules (FSSAI / Codex Mappings)
  await sql`
    CREATE TABLE IF NOT EXISTS foodcue_intelligence_rules (
      rule_id VARCHAR(64) PRIMARY KEY,
      rule_name VARCHAR(128) NOT NULL,
      category VARCHAR(32) NOT NULL,
      pattern_regex TEXT NOT NULL,
      consequence_level VARCHAR(32) NOT NULL,
      legal_reference VARCHAR(128),
      explanation_template TEXT NOT NULL,
      version VARCHAR(16) DEFAULT '1.0',
      active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✓ Table foodcue_intelligence_rules ready");

  // 10. Audit Log
  await sql`
    CREATE TABLE IF NOT EXISTS foodcue_audit_log (
      audit_id VARCHAR(64) PRIMARY KEY,
      user_id VARCHAR(64) DEFAULT 'local-user',
      action VARCHAR(64) NOT NULL,
      resource_type VARCHAR(64) NOT NULL,
      resource_id VARCHAR(128),
      details JSONB DEFAULT '{}'::jsonb,
      ip_hash VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✓ Table foodcue_audit_log ready");

  // 11. Households & Family Sharing (Clerk Organizations)
  await sql`
    CREATE TABLE IF NOT EXISTS foodcue_households (
      household_id VARCHAR(128) PRIMARY KEY,
      name VARCHAR(256) NOT NULL,
      slug VARCHAR(128),
      image_url TEXT,
      created_by_user_id VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `;
  console.log("✓ Table foodcue_households ready");

  // Multi-Tenancy Columns for Household/Family Kitchen Sharing
  await sql`ALTER TABLE foodcue_pantry_items ADD COLUMN IF NOT EXISTS household_id VARCHAR(128);`;
  await sql`ALTER TABLE foodcue_pantry_events ADD COLUMN IF NOT EXISTS household_id VARCHAR(128);`;
  await sql`ALTER TABLE foodcue_shopping_list ADD COLUMN IF NOT EXISTS household_id VARCHAR(128);`;
  await sql`ALTER TABLE foodcue_reminders ADD COLUMN IF NOT EXISTS household_id VARCHAR(128);`;
  await sql`ALTER TABLE foodcue_profiles ADD COLUMN IF NOT EXISTS household_id VARCHAR(128);`;
  console.log("✓ Multi-tenancy household_id columns configured");

  // Create Critical Indexes
  await sql`CREATE INDEX IF NOT EXISTS idx_catalog_gtin ON foodcue_catalog(gtin);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_catalog_brand ON foodcue_catalog(brand);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pantry_items_user ON foodcue_pantry_items(user_id, status);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pantry_events_item ON foodcue_pantry_events(item_id, occurred_at);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_reminders_target ON foodcue_reminders(user_id, status, target_date);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_shopping_user ON foodcue_shopping_list(user_id, checked);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pantry_items_household ON foodcue_pantry_items(household_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_pantry_events_household ON foodcue_pantry_events(household_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_shopping_list_household ON foodcue_shopping_list(household_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_reminders_household ON foodcue_reminders(household_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_profiles_household ON foodcue_profiles(household_id);`;
  console.log("✓ Performance & household indexes created");

  // Seed default anonymous user and local profile
  await sql`
    INSERT INTO foodcue_users (user_id, is_anonymous, display_name)
    VALUES ('local-user', TRUE, 'Kitchen Chief')
    ON CONFLICT (user_id) DO NOTHING;
  `;

  await sql`
    INSERT INTO foodcue_profiles (profile_id, user_id, allergens_to_avoid, ingredients_to_avoid, dietary_preference, calm_mode)
    VALUES (
      'default-profile',
      'local-user',
      ARRAY['milk', 'peanuts', 'gluten'],
      ARRAY['palm oil', 'high fructose corn syrup', 'ins 621'],
      'standard',
      FALSE
    )
    ON CONFLICT (profile_id) DO NOTHING;
  `;
  console.log("✓ Default user and profile seeded");

  // Seed catalog products
  const products = [
    {
      id: "cat_parle_g",
      gtin: "8901719101038",
      brand: "Parle",
      name: "Parle-G Glucose Biscuits",
      variant: "Original Glucose",
      pack: "800g",
      fssai: "10013022002253",
      category: "Snacks",
      ingredients: "Wheat Flour (67%), Sugar, Edible Vegetable Oil (Palm Oil), Invert Sugar Syrup, Raising Agents [INS 503(ii), INS 500(ii)], Salt, Milk Solids (0.6%), Emulsifier [INS 322] and Dough Conditioner [INS 223].",
      allergens: "Contains Wheat and Milk. May Contain Soy and Sulphites.",
      nutrition: { energyKcal: 454, proteinG: 6.5, carbsG: 78.2, sugarsG: 25.5, fatG: 13.0, sodiumMg: 280 }
    },
    {
      id: "cat_amul_butter",
      gtin: "8901262010053",
      brand: "Amul",
      name: "Amul Butter (Pasteurised)",
      variant: "Salted",
      pack: "100g",
      fssai: "10012021000071",
      category: "Dairy",
      ingredients: "Butter (Milk Fat 80%), Common Salt (2.5%), Annatto colour [INS 160b(i)].",
      allergens: "Contains Milk.",
      nutrition: { energyKcal: 722, proteinG: 0.5, carbsG: 0.0, sugarsG: 0.0, fatG: 80.0, sodiumMg: 830 }
    },
    {
      id: "cat_maggi_noodles",
      gtin: "8901058852331",
      brand: "Maggi",
      name: "Maggi 2-Minute Masala Noodles",
      variant: "Masala",
      pack: "70g",
      fssai: "10012011000168",
      category: "Staples",
      ingredients: "Noodles: Refined Wheat Flour (Maida), Palm Oil, Salt, Wheat Gluten, Mineral (Calcium Carbonate), Thickeners (INS 508, INS 412), Acidity Regulators (INS 501(i), INS 500(i)) and Humectant (INS 451(i)). Masala Tastemaker: Hydrolysed groundnut protein, Mixed spices (23.6%) (Dehydrated onion, Coriander powder, Red chilli powder, Turmeric powder, Dried garlic, Cumin powder, Aniseed powder, Fenugreek powder, Ginger powder, Black pepper powder, Clove powder, Nutmeg powder, Cardamom powder), Noodle powder, Sugar, Edible starch, Palm oil, Thickener (INS 508), Caramel salt mix, Acidity regulator (INS 330), Flavour enhancer (INS 635) and Mineral (Ferric pyrophosphate).",
      allergens: "Contains Wheat and Nut (Groundnut). May Contain Milk, Mustard and Soy.",
      nutrition: { energyKcal: 427, proteinG: 8.0, carbsG: 63.5, sugarsG: 2.2, fatG: 15.7, sodiumMg: 1020 }
    },
    {
      id: "cat_tata_salt",
      gtin: "8901052000011",
      brand: "Tata",
      name: "Tata Salt Vacuum Evaporated Iodised Salt",
      variant: "Iodised",
      pack: "1kg",
      fssai: "10014022002759",
      category: "Staples",
      ingredients: "Edible Common Salt, Potassium Iodate (Iodine >= 15 ppm), Anticaking Agent [INS 551].",
      allergens: "None declared.",
      nutrition: { energyKcal: 0, proteinG: 0.0, carbsG: 0.0, sugarsG: 0.0, fatG: 0.0, sodiumMg: 38700 }
    }
  ];

  for (const p of products) {
    await sql`
      INSERT INTO foodcue_catalog (
        catalog_id, gtin, brand, product_name, variant, pack_size, category,
        fssai_licence, ingredients_text, allergen_declaration, nutrition_facts, verified
      ) VALUES (
        ${p.id}, ${p.gtin}, ${p.brand}, ${p.name}, ${p.variant}, ${p.pack}, ${p.category},
        ${p.fssai}, ${p.ingredients}, ${p.allergens}, ${JSON.stringify(p.nutrition)}, TRUE
      )
      ON CONFLICT (gtin) DO UPDATE SET
        product_name = EXCLUDED.product_name,
        ingredients_text = EXCLUDED.ingredients_text,
        nutrition_facts = EXCLUDED.nutrition_facts;
    `;
  }
  console.log(`✓ Seeded ${products.length} verified Indian packaged foods into foodcue_catalog`);

  // Verify tables in information_schema
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'foodcue_%'
    ORDER BY table_name;
  `;
  console.log("\n=================================");
  console.log("Neon Postgres Public Tables Active:");
  tables.forEach(t => console.log(` - ${t.table_name}`));
  console.log("=================================\n");
  console.log("Database is 100% ready!");
}

runMigration().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
