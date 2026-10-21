import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  numeric,
  date,
  index,
} from "drizzle-orm/pg-core";

/**
 * User accounts. Every data row below carries `ownerId` so each landlord's
 * data is fully isolated from every other account.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const landlordProfile = pgTable(
  "landlord_profile",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    nida: text("nida"),
    location: text("location"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("landlord_profile_owner_idx").on(t.ownerId)]
);

export const rooms = pgTable(
  "rooms",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    monthlyRent: integer("monthly_rent").notNull().default(0),
    description: text("description"),
    status: text("status").notNull().default("empty"), // empty | occupied
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("rooms_owner_idx").on(t.ownerId)]
);

export const tenants = pgTable(
  "tenants",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),
    nida: text("nida"),
    photoUrl: text("photo_url"),
    roomId: integer("room_id").references(() => rooms.id),
    monthlyRent: integer("monthly_rent").notNull().default(0),
    deposit: integer("deposit").default(0),
    moveInDate: date("move_in_date"),
    status: text("status").notNull().default("active"), // active | moved_out
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("tenants_owner_idx").on(t.ownerId)]
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: integer("tenant_id")
      .references(() => tenants.id)
      .notNull(),
    roomId: integer("room_id").references(() => rooms.id),
    amount: integer("amount").notNull(),
    paymentDate: date("payment_date").notNull(),
    method: text("method").notNull().default("cash"), // cash | mpesa | bank | other
    periodMonth: text("period_month"), // e.g. "2026-10"
    reference: text("reference"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("payments_owner_idx").on(t.ownerId)]
);

export const contractSettings = pgTable(
  "contract_settings",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    clauses: text("clauses"),
    defaultDurationMonths: integer("default_duration_months").default(12),
    defaultPaymentIntervalMonths: integer("default_payment_interval_months").default(1),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("contract_settings_owner_idx").on(t.ownerId)]
);

export const smsTemplates = pgTable(
  "sms_templates",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // receipt | reminder
    content: text("content").notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("sms_templates_owner_idx").on(t.ownerId)]
);

/** Per-landlord SMS gateway credentials (Africa's Talking). The API key is
 * write-only: it is never returned to the client, only used server-side. */
export const smsConfig = pgTable(
  "sms_config",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("africastalking"),
    username: text("username").notNull(),
    apiKey: text("api_key").notNull(),
    senderId: text("sender_id"), // alphanumeric sender name; null = provider default
    sandbox: boolean("sandbox").notNull().default(true),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("sms_config_owner_idx").on(t.ownerId)]
);

/** History of SMS sent through the gateway, for receipts and accountability. */
export const smsLogs = pgTable(
  "sms_logs",
  {
    id: serial("id").primaryKey(),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tenantId: integer("tenant_id").references(() => tenants.id),
    phone: text("phone").notNull(),
    message: text("message").notNull(),
    kind: text("kind").notNull().default("receipt"), // receipt | reminder | custom
    status: text("status").notNull().default("sent"), // sent | failed
    providerRef: text("provider_ref"), // provider message id, when accepted
    cost: text("cost"), // raw provider cost string, e.g. "TZS 15.0000"
    errorText: text("error_text"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("sms_logs_owner_idx").on(t.ownerId)]
);

export type User = typeof users.$inferSelect;
export type LandlordProfile = typeof landlordProfile.$inferSelect;
export type Room = typeof rooms.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type ContractSettings = typeof contractSettings.$inferSelect;
export type SmsTemplate = typeof smsTemplates.$inferSelect;
export type SmsConfig = typeof smsConfig.$inferSelect;
export type SmsLog = typeof smsLogs.$inferSelect;
