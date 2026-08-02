import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  decimal,
  integer,
  date,
  timestamp,
  jsonb,
  bigserial,
  customType,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Custom PostGIS Geography Point Type for Drizzle
export const geographyPoint = customType<{
  data: { latitude: number; longitude: number };
  driverData: string;
}>({
  dataType() {
    return 'geography(Point, 4326)';
  },
  toDriver(value) {
    return `POINT(${value.longitude} ${value.latitude})`;
  },
  fromDriver(value) {
    // Expected format: POINT(lng lat) or binary representation
    if (typeof value === 'string' && value.startsWith('POINT')) {
      const match = value.match(/POINT\((-?\d+\.?\d*)\s+(-?\d+\.?\d*)\)/);
      if (match) {
        return { longitude: parseFloat(match[1]), latitude: parseFloat(match[2]) };
      }
    }
    return { latitude: 0, longitude: 0 };
  },
});

// ----------------------------------------------------------------------
// USERS TABLE
// ----------------------------------------------------------------------
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(),
  role: varchar('role', { length: 50 }).default('pharmacy').notNull(), // 'pharmacy' | 'admin'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ----------------------------------------------------------------------
// PHARMACIES TABLE
// ----------------------------------------------------------------------
export const pharmacies = pgTable('pharmacies', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  ownerName: varchar('owner_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 15 }).notNull().unique(),
  email: varchar('email', { length: 255 }).unique(),
  address: text('address').notNull(),
  latitude: decimal('latitude', { precision: 10, scale: 8 }).notNull(),
  longitude: decimal('longitude', { precision: 11, scale: 8 }).notNull(),
  location: geographyPoint('location'),
  city: varchar('city', { length: 100 }).notNull(),
  pincode: varchar('pincode', { length: 10 }).notNull(),
  drugLicenseNo: varchar('drug_license_no', { length: 50 }).notNull().unique(),
  licenseType: varchar('license_type', { length: 10 }).notNull(), // 'Form20' | 'Form21'
  licenseScanUrl: text('license_scan_url'),
  isVerified: boolean('is_verified').default(false).notNull(),
  trustScore: decimal('trust_score', { precision: 3, scale: 2 }).default('0.50').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ----------------------------------------------------------------------
// DRUGS MASTER TABLE
// ----------------------------------------------------------------------
export const drugs = pgTable('drugs', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandName: varchar('brand_name', { length: 255 }).notNull(),
  saltName: varchar('salt_name', { length: 255 }).notNull(),
  manufacturer: varchar('manufacturer', { length: 255 }),
  strength: varchar('strength', { length: 50 }),
  form: varchar('form', { length: 50 }),
  schedule: varchar('schedule', { length: 10 }), // 'H', 'H1', 'X', 'G'
  isNarcotic: boolean('is_narcotic').default(false).notNull(),
  isScheduleX: boolean('is_schedule_x').default(false).notNull(),
  barcodeGs1: varchar('barcode_gs1', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ----------------------------------------------------------------------
// LISTINGS TABLE
// ----------------------------------------------------------------------
export const listings = pgTable('listings', {
  id: uuid('id').defaultRandom().primaryKey(),
  pharmacyId: uuid('pharmacy_id').references(() => pharmacies.id, { onDelete: 'cascade' }).notNull(),
  drugId: uuid('drug_id').references(() => drugs.id).notNull(),
  batchNumber: varchar('batch_number', { length: 100 }).notNull(),
  expiryDate: date('expiry_date').notNull(),
  quantity: integer('quantity').notNull(),
  mrp: decimal('mrp', { precision: 10, scale: 2 }).notNull(),
  askingPrice: decimal('asking_price', { precision: 10, scale: 2 }).notNull(),
  discountPct: decimal('discount_pct', { precision: 5, scale: 2 }).notNull(),
  urgencyScore: decimal('urgency_score', { precision: 6, scale: 4 }),
  status: varchar('status', { length: 20 }).default('active').notNull(), // 'active' | 'reserved' | 'sold' | 'expired' | 'removed'
  listedAt: timestamp('listed_at').defaultNow().notNull(),
  expiresAt: date('expires_at').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ----------------------------------------------------------------------
// ORDERS TABLE
// ----------------------------------------------------------------------
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  listingId: uuid('listing_id').references(() => listings.id).notNull(),
  buyerId: uuid('buyer_id').references(() => pharmacies.id).notNull(),
  sellerId: uuid('seller_id').references(() => pharmacies.id).notNull(),
  quantity: integer('quantity').notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(), // 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'cancelled' | 'disputed'
  pickupType: varchar('pickup_type', { length: 20 }).default('self_pickup').notNull(), // 'self_pickup' | 'courier'
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  invoiceUrl: text('invoice_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ----------------------------------------------------------------------
// DEMAND SIGNALS TABLE
// ----------------------------------------------------------------------
export const demandSignals = pgTable('demand_signals', {
  id: uuid('id').defaultRandom().primaryKey(),
  drugId: uuid('drug_id').references(() => drugs.id).notNull(),
  pincode: varchar('pincode', { length: 10 }),
  city: varchar('city', { length: 100 }),
  signalCount: integer('signal_count').default(1).notNull(),
  weekStart: date('week_start').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ----------------------------------------------------------------------
// NOTIFICATIONS TABLE
// ----------------------------------------------------------------------
export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  pharmacyId: uuid('pharmacy_id').references(() => pharmacies.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'expiry_alert' | 'new_match' | 'order_update'
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  metadata: jsonb('metadata'),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ----------------------------------------------------------------------
// AUDIT LOG TABLE
// ----------------------------------------------------------------------
export const auditLogs = pgTable('audit_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  actorId: uuid('actor_id'),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id'),
  oldData: jsonb('old_data'),
  newData: jsonb('new_data'),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ----------------------------------------------------------------------
// RELATIONS
// ----------------------------------------------------------------------
export const usersRelations = relations(users, ({ one }) => ({
  pharmacy: one(pharmacies, {
    fields: [users.id],
    references: [pharmacies.userId],
  }),
}));

export const pharmaciesRelations = relations(pharmacies, ({ one, many }) => ({
  user: one(users, {
    fields: [pharmacies.userId],
    references: [users.id],
  }),
  listings: many(listings),
  notifications: many(notifications),
}));

export const drugsRelations = relations(drugs, ({ many }) => ({
  listings: many(listings),
  demandSignals: many(demandSignals),
}));

export const listingsRelations = relations(listings, ({ one }) => ({
  pharmacy: one(pharmacies, {
    fields: [listings.pharmacyId],
    references: [pharmacies.id],
  }),
  drug: one(drugs, {
    fields: [listings.drugId],
    references: [drugs.id],
  }),
}));
