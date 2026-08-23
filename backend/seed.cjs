/**
 * seed.cjs — idempotent sample data for zzonecreative@gmail.com
 *
 * Creates: pharmacy profile (if missing), drug catalog rows, and ~12
 * listing batches spread across urgency bands so the dashboard's
 * value-at-risk meter, urgent list, inventory table, decay chips,
 * filters, and the marketplace all render with varied data.
 *
 * Run:  node seed.cjs   (from backend/, reads .env)
 */

const { Client } = require("pg");
require("dotenv").config();

const EMAIL = "zzonecreative@gmail.com";

/* [brandName, saltName, form, manufacturer, mrp, askingPrice, quantity, daysFromToday] */
const BATCHES = [
  // ── Urgent (< 30 days) ──
  ["Dolo 650mg",         "Paracetamol",            "Tablet",   "Micro Labs",        34.0,  18.0, 120, 12],
  ["Augmentin 625 Duo",  "Amoxicillin + Clavulanic","Tablet",  "GSK Pharma",       204.0, 118.0,  45, 21],
  ["Combiflam",          "Ibuprofen + Paracetamol", "Tablet",  "Sanofi India",      42.0,  24.0,  80, 27],
  ["Azithral 500mg",     "Azithromycin",           "Tablet",  "Alembic Pharma",   119.0,  68.0,  60, 8],
  // ── Approaching (30–90 days) ──
  ["Crestor 10mg",       "Rosuvastatin",           "Tablet",  "Cipla Ltd",        310.0, 198.0,  30, 48],
  ["Pantocid 40mg",      "Pantoprazole",           "Tablet",  "Sun Pharma",       142.0,  84.0,  90, 62],
  ["Metformin SR 500",   "Metformin HCl",          "Tablet",  "USV Ltd",           28.0,  16.5, 240, 75],
  // ── Stable (> 90 days) ──
  ["Crocin Advance",     "Paracetamol",            "Tablet",  "GSK Pharma",        30.0,  22.0, 300, 210],
  ["Shelcal 500",        "Calcium + Vitamin D3",   "Tablet",  "Torrent Pharma",   128.0,  96.0, 150, 260],
  ["Telma 40mg",         "Telmisartan",            "Tablet",  "Glenmark",         165.0, 122.0, 110, 320],
  ["Cetirizine 10mg",    "Cetirizine HCl",         "Tablet",  "Dr Reddy's",        24.0,  15.0, 400, 400],
  ["Amoxyclav 1.2g Inj", "Amoxicillin + Sulbactam","Injection","Alkem Labs",      210.0, 155.0,  40, 180],
];

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: /supabase|render|railway/.test(process.env.DATABASE_URL || "")
      ? { rejectUnauthorized: false }
      : false,
  });

  await client.connect();
  console.log("✓ connected to database");

  try {
    await client.query("BEGIN");

    /* 1. Find the user */
    const userRes = await client.query(
      "SELECT id, name FROM users WHERE email = $1",
      [EMAIL],
    );
    if (userRes.rows.length === 0) {
      throw new Error(
        `No user found with email ${EMAIL}. Sign up once in the app first, then re-run this script.`,
      );
    }
    const user = userRes.rows[0];
    console.log(`✓ user found: ${user.name} (${user.id})`);

    /* 2. Pharmacy profile (create if missing) */
    let pharmacyRes = await client.query(
      "SELECT id FROM pharmacies WHERE user_id = $1",
      [user.id],
    );

    if (pharmacyRes.rows.length === 0) {
      pharmacyRes = await client.query(
        `INSERT INTO pharmacies
           (user_id, name, owner_name, phone, email, address,
            latitude, longitude, location, city, pincode,
            drug_license_no, license_type, is_verified, trust_score)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,
                 ST_SetSRID(ST_MakePoint($9,$10),4326)::geography,
                 $11,$12,$13,$14,true,'0.85')
         RETURNING id`,
        [
          user.id,
          "Zone Creative Pharmacy",
          user.name || "Zone Creative",
          "9876543210",
          EMAIL,
          "Shop 14, Sai Plaza, Baner Road",
          18.5590,               // latitude
          73.7868,               // longitude
          73.7868,               // lng for PostGIS point
          18.5590,               // lat for PostGIS point
          "Pune",
          "411045",
          "MH-PUN-20B-99887",
          "20B",
        ],
      );
      console.log("✓ pharmacy profile created");
    } else {
      console.log("• pharmacy profile already exists");
    }
    const pharmacyId = pharmacyRes.rows[0].id;

    /* 3. Drugs + listings (skip batch numbers that already exist) */
    let drugsAdded = 0;
    let listingsAdded = 0;
    const today = Date.now();

    for (const [brand, salt, form, mfr, mrp, price, qty, days] of BATCHES) {
      let drugRes = await client.query(
        "SELECT id FROM drugs WHERE brand_name = $1 LIMIT 1",
        [brand],
      );
      if (drugRes.rows.length === 0) {
        drugRes = await client.query(
          `INSERT INTO drugs (brand_name, salt_name, form, manufacturer)
           VALUES ($1,$2,$3,$4) RETURNING id`,
          [brand, salt, form, mfr],
        );
        drugsAdded += 1;
      }
      const drugId = drugRes.rows[0].id;

      const expiryDate = new Date(today + days * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const batchNumber =
        "BN-" +
        Math.abs(
          [...brand].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 90000,
        )
          .toString()
          .padStart(5, "0");

      const exists = await client.query(
        "SELECT 1 FROM listings WHERE pharmacy_id = $1 AND batch_number = $2",
        [pharmacyId, batchNumber],
      );
      if (exists.rows.length > 0) continue;

      const discountPct = (((mrp - price) / mrp) * 100).toFixed(2);
      const urgencyScore = Math.min(1, Math.max(0, 1 - days / 365)).toFixed(4);

      await client.query(
        `INSERT INTO listings
           (pharmacy_id, drug_id, batch_number, expiry_date, quantity,
            mrp, asking_price, discount_pct, urgency_score, status, expires_at)
         VALUES ($1,$2,$3,$4::date,$5,$6,$7,$8,$9,'active',$4::date)`,
        [pharmacyId, drugId, batchNumber, expiryDate, qty, mrp, price, discountPct, urgencyScore],
      );
      listingsAdded += 1;
    }

    console.log(
      `✓ seed complete: ${drugsAdded} drugs added, ${listingsAdded} listings added (${BATCHES.length - listingsAdded} already present)`,
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("✗ seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
