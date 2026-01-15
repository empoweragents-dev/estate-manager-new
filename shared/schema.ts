import { relations, sql } from "drizzle-orm";
import { mysqlTable, varchar, int, decimal, boolean, date, timestamp, mysqlEnum, index, json, text } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enum Values (MySQL Enums are defined per column)
const userRoles = ['super_admin', 'owner'] as const;
const floors = ['ground', 'first', 'second', 'subedari'] as const;
const subedariCategories = ['shops', 'residential'] as const;
const shopStatuses = ['vacant', 'occupied'] as const;
const ownershipTypes = ['sole', 'common'] as const;
const leaseStatuses = ['active', 'expiring_soon', 'expired', 'terminated'] as const;
const expenseTypes = ['guard', 'cleaner', 'electricity', 'maintenance', 'other'] as const;
const expenseAllocations = ['owner', 'common'] as const;
const deletionRecordTypes = ['payment', 'bank_deposit', 'tenant', 'shop', 'lease', 'expense'] as const;

// Session storage table for Replit Auth (or general session)
export const sessions = mysqlTable(
  "sessions",
  {
    sid: varchar("sid", { length: 255 }).primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { mode: "date" }).notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Owners table - 5 distinct owner profiles
export const owners = mysqlTable("owners", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 255 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  bankName: varchar("bank_name", { length: 255 }),
  bankAccountNumber: varchar("bank_account_number", { length: 255 }),
  bankBranch: varchar("bank_branch", { length: 255 }),
});

export const ownersRelations = relations(owners, ({ many }) => ({
  shops: many(shops),
  expenses: many(expenses),
  bankDeposits: many(bankDeposits),
  users: many(users),
}));

// Users table with roles - for authentication
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(), // Manual UUID or app-generated
  username: varchar("username", { length: 255 }).unique().notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  phone: varchar("phone", { length: 255 }),
  role: mysqlEnum("role", userRoles).notNull().default('owner'),
  ownerId: int("owner_id").references(() => owners.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export const usersRelations = relations(users, ({ one }) => ({
  owner: one(owners, {
    fields: [users.ownerId],
    references: [owners.id],
  }),
}));

// Shops/Units table
export const shops = mysqlTable("shops", {
  id: int("id").primaryKey().autoincrement(),
  shopNumber: varchar("shop_number", { length: 50 }).notNull(),
  floor: mysqlEnum("floor", floors).notNull(),
  subedariCategory: mysqlEnum("subedari_category", subedariCategories), // only used when floor is 'subedari'
  squareFeet: decimal("square_feet", { precision: 10, scale: 2 }),
  status: mysqlEnum("status", shopStatuses).notNull().default('vacant'),
  ownershipType: mysqlEnum("ownership_type", ownershipTypes).notNull(),
  ownerId: int("owner_id").references(() => owners.id), // null if common ownership
  description: text("description"),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletionReason: text("deletion_reason"),
  deletedBy: varchar("deleted_by", { length: 36 }).references(() => users.id),
});

export const shopsRelations = relations(shops, ({ one, many }) => ({
  owner: one(owners, {
    fields: [shops.ownerId],
    references: [owners.id],
  }),
  leases: many(leases),
}));

// Tenants table
export const tenants = mysqlTable("tenants", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  email: varchar("email", { length: 255 }),
  businessName: varchar("business_name", { length: 255 }),
  nidPassport: varchar("nid_passport", { length: 255 }),
  permanentAddress: text("permanent_address"),
  photoUrl: text("photo_url"),
  notes: text("notes"), // Admin notes about tenant
  openingDueBalance: decimal("opening_due_balance", { precision: 12, scale: 2 }).notNull().default('0'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletionReason: text("deletion_reason"),
  deletedBy: varchar("deleted_by", { length: 36 }).references(() => users.id),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  leases: many(leases),
  payments: many(payments),
}));

// Leases table
export const leases = mysqlTable("leases", {
  id: int("id").primaryKey().autoincrement(),
  tenantId: int("tenant_id").notNull().references(() => tenants.id),
  shopId: int("shop_id").notNull().references(() => shops.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  securityDeposit: decimal("security_deposit", { precision: 12, scale: 2 }).notNull(),
  securityDepositUsed: decimal("security_deposit_used", { precision: 12, scale: 2 }).notNull().default('0'),
  monthlyRent: decimal("monthly_rent", { precision: 12, scale: 2 }).notNull(),
  openingDueBalance: decimal("opening_due_balance", { precision: 12, scale: 2 }).notNull().default('0'),
  status: mysqlEnum("status", leaseStatuses).notNull().default('active'),
  notes: text("notes"),
  terminationNotes: text("termination_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const leasesRelations = relations(leases, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [leases.tenantId],
    references: [tenants.id],
  }),
  shop: one(shops, {
    fields: [leases.shopId],
    references: [shops.id],
  }),
  rentInvoices: many(rentInvoices),
  rentAdjustments: many(rentAdjustments),
}));

// Rent Adjustments - history of rent changes
export const rentAdjustments = mysqlTable("rent_adjustments", {
  id: int("id").primaryKey().autoincrement(),
  leaseId: int("lease_id").notNull().references(() => leases.id),
  previousRent: decimal("previous_rent", { precision: 12, scale: 2 }).notNull(),
  newRent: decimal("new_rent", { precision: 12, scale: 2 }).notNull(),
  adjustmentAmount: decimal("adjustment_amount", { precision: 12, scale: 2 }).notNull(), // positive for increase, negative for decrease
  effectiveDate: date("effective_date").notNull(),
  agreementTerms: text("agreement_terms"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rentAdjustmentsRelations = relations(rentAdjustments, ({ one }) => ({
  lease: one(leases, {
    fields: [rentAdjustments.leaseId],
    references: [leases.id],
  }),
}));

// Rent Invoices - monthly rent generation
export const rentInvoices = mysqlTable("rent_invoices", {
  id: int("id").primaryKey().autoincrement(),
  leaseId: int("lease_id").notNull().references(() => leases.id),
  tenantId: int("tenant_id").notNull().references(() => tenants.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  month: int("month").notNull(), // 1-12
  year: int("year").notNull(),
  isPaid: boolean("is_paid").notNull().default(false),
  paidAmount: decimal("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"), // Track partial payments
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rentInvoicesRelations = relations(rentInvoices, ({ one }) => ({
  lease: one(leases, {
    fields: [rentInvoices.leaseId],
    references: [leases.id],
  }),
  tenant: one(tenants, {
    fields: [rentInvoices.tenantId],
    references: [tenants.id],
  }),
}));

// Payments table
export const payments = mysqlTable("payments", {
  id: int("id").primaryKey().autoincrement(),
  tenantId: int("tenant_id").notNull().references(() => tenants.id),
  leaseId: int("lease_id").notNull().references(() => leases.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  rentMonths: json("rent_months").$type<string[]>(), // Array of "YYYY-MM" strings. MySQL uses json
  receiptNumber: varchar("receipt_number", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletionReason: text("deletion_reason"),
  deletedBy: varchar("deleted_by", { length: 36 }).references(() => users.id),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payments.tenantId],
    references: [tenants.id],
  }),
  lease: one(leases, {
    fields: [payments.leaseId],
    references: [leases.id],
  }),
}));

// Bank Deposits - tracking deposits to owner accounts
export const bankDeposits = mysqlTable("bank_deposits", {
  id: int("id").primaryKey().autoincrement(),
  ownerId: int("owner_id").notNull().references(() => owners.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  depositDate: date("deposit_date").notNull(),
  bankName: varchar("bank_name", { length: 255 }).notNull(),
  depositSlipRef: varchar("deposit_slip_ref", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  deletedAt: timestamp("deleted_at"),
  deletionReason: text("deletion_reason"),
  deletedBy: varchar("deleted_by", { length: 36 }).references(() => users.id),
});

export const bankDepositsRelations = relations(bankDeposits, ({ one }) => ({
  owner: one(owners, {
    fields: [bankDeposits.ownerId],
    references: [owners.id],
  }),
}));

// Expenses table
export const expenses = mysqlTable("expenses", {
  id: int("id").primaryKey().autoincrement(),
  expenseType: mysqlEnum("expense_type", expenseTypes).notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  expenseDate: date("expense_date").notNull(),
  allocation: mysqlEnum("allocation", expenseAllocations).notNull(),
  ownerId: int("owner_id").references(() => owners.id), // null if common expense
  receiptRef: varchar("receipt_ref", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  owner: one(owners, {
    fields: [expenses.ownerId],
    references: [owners.id],
  }),
}));

// Settings table - for exchange rate and other configs
export const settings = mysqlTable("settings", {
  id: int("id").primaryKey().autoincrement(),
  key: varchar("key", { length: 255 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
});

// Deletion Logs table - audit trail for deleted records
export const deletionLogs = mysqlTable("deletion_logs", {
  id: int("id").primaryKey().autoincrement(),
  recordType: mysqlEnum("record_type", deletionRecordTypes).notNull(),
  recordId: int("record_id").notNull(),
  recordDetails: json("record_details").notNull(), // Snapshot of the deleted record
  reason: text("reason").notNull(),
  deletedBy: varchar("deleted_by", { length: 36 }).references(() => users.id),
  deletedAt: timestamp("deleted_at").notNull().defaultNow(),
});

export const deletionLogsRelations = relations(deletionLogs, ({ one }) => ({
  deletedByUser: one(users, {
    fields: [deletionLogs.deletedBy],
    references: [users.id],
  }),
}));

// Insert Schemas
export const insertOwnerSchema = createInsertSchema(owners).omit({ id: true });
export const insertShopSchema = createInsertSchema(shops).omit({ id: true });
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true });
export const insertLeaseSchema = createInsertSchema(leases, {
  startDate: z.preprocess((arg) => {
    if (typeof arg == 'string') return new Date(arg);
    return arg;
  }, z.date()),
  endDate: z.preprocess((arg) => {
    if (typeof arg == 'string') return new Date(arg);
    return arg;
  }, z.date()),
}).omit({ id: true, createdAt: true });
export const insertRentInvoiceSchema = createInsertSchema(rentInvoices, {
  dueDate: z.preprocess((arg) => {
    if (typeof arg == 'string') return new Date(arg);
    return arg;
  }, z.date()),
}).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments, {
  paymentDate: z.preprocess((arg) => {
    if (typeof arg == 'string') return new Date(arg);
    return arg;
  }, z.date())
}).omit({ id: true, createdAt: true });
export const insertBankDepositSchema = createInsertSchema(bankDeposits, {
  depositDate: z.preprocess((arg) => {
    if (typeof arg == 'string') return new Date(arg);
    return arg;
  }, z.date()),
}).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses, {
  expenseDate: z.preprocess((arg) => {
    if (typeof arg == 'string') return new Date(arg);
    return arg;
  }, z.date()),
}).omit({ id: true, createdAt: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertRentAdjustmentSchema = createInsertSchema(rentAdjustments, {
  effectiveDate: z.preprocess((arg) => {
    if (typeof arg == 'string') return new Date(arg);
    return arg;
  }, z.date()),
}).omit({ id: true, createdAt: true });
export const insertDeletionLogSchema = createInsertSchema(deletionLogs).omit({ id: true, deletedAt: true });

// User types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserRole = 'super_admin' | 'owner';

// Types
export type Owner = typeof owners.$inferSelect;
export type InsertOwner = z.infer<typeof insertOwnerSchema>;

export type Shop = typeof shops.$inferSelect;
export type InsertShop = z.infer<typeof insertShopSchema>;

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;

export type Lease = typeof leases.$inferSelect;
export type InsertLease = z.infer<typeof insertLeaseSchema>;

export type RentInvoice = typeof rentInvoices.$inferSelect;
export type InsertRentInvoice = z.infer<typeof insertRentInvoiceSchema>;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type BankDeposit = typeof bankDeposits.$inferSelect;
export type InsertBankDeposit = z.infer<typeof insertBankDepositSchema>;

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export type RentAdjustment = typeof rentAdjustments.$inferSelect;
export type InsertRentAdjustment = z.infer<typeof insertRentAdjustmentSchema>;

export type DeletionLog = typeof deletionLogs.$inferSelect;
export type InsertDeletionLog = z.infer<typeof insertDeletionLogSchema>;
export type DeletionRecordType = 'payment' | 'bank_deposit' | 'tenant' | 'shop' | 'lease' | 'expense';

// Extended types for frontend use with relations
export type ShopWithOwner = Shop & { owner?: Owner };
export type LeaseWithDetails = Lease & { tenant: Tenant; shop: ShopWithOwner };
export type TenantWithDues = Tenant & {
  totalDue: number;
  totalPaid: number;
  currentDue: number;
};

// Additional Payments (Financial Statement Only)
const additionalPaymentTypes = ['advance_adjustment', 'service_charge', 'other'] as const;

export const additionalPayments = mysqlTable("additional_payments", {
  id: int("id").primaryKey().autoincrement(),
  tenantId: int("tenant_id").notNull(), // No FK constraint strictly required if optional, but usually yes. Previous code had it.
  ownerId: int("owner_id").notNull(),
  paymentType: mysqlEnum("payment_type", additionalPaymentTypes).notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isDeleted: boolean("is_deleted").notNull().default(false),
});

export const insertAdditionalPaymentSchema = createInsertSchema(additionalPayments).omit({ id: true, createdAt: true });
export type AdditionalPayment = typeof additionalPayments.$inferSelect;
export type InsertAdditionalPayment = z.infer<typeof insertAdditionalPaymentSchema>;
