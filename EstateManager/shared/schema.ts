import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, date, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const floorEnum = pgEnum('floor', ['ground', 'first', 'second', 'subedari']);
export const subedariCategoryEnum = pgEnum('subedari_category', ['shops', 'residential']);
export const shopStatusEnum = pgEnum('shop_status', ['vacant', 'occupied']);
export const ownershipTypeEnum = pgEnum('ownership_type', ['sole', 'common']);
export const leaseStatusEnum = pgEnum('lease_status', ['active', 'expiring_soon', 'expired', 'terminated']);
export const expenseTypeEnum = pgEnum('expense_type', ['guard', 'cleaner', 'electricity', 'maintenance', 'other']);
export const expenseAllocationEnum = pgEnum('expense_allocation', ['owner', 'common']);

// Owners table - 5 distinct owner profiles
export const owners = pgTable("owners", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankBranch: text("bank_branch"),
});

export const ownersRelations = relations(owners, ({ many }) => ({
  shops: many(shops),
  expenses: many(expenses),
  bankDeposits: many(bankDeposits),
}));

// Shops/Units table
export const shops = pgTable("shops", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  shopNumber: text("shop_number").notNull().unique(),
  floor: floorEnum("floor").notNull(),
  subedariCategory: subedariCategoryEnum("subedari_category"), // only used when floor is 'subedari'
  squareFeet: decimal("square_feet", { precision: 10, scale: 2 }),
  status: shopStatusEnum("status").notNull().default('vacant'),
  ownershipType: ownershipTypeEnum("ownership_type").notNull(),
  ownerId: integer("owner_id").references(() => owners.id), // null if common ownership
  description: text("description"),
});

export const shopsRelations = relations(shops, ({ one, many }) => ({
  owner: one(owners, {
    fields: [shops.ownerId],
    references: [owners.id],
  }),
  leases: many(leases),
}));

// Tenants table
export const tenants = pgTable("tenants", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  nidPassport: text("nid_passport"),
  permanentAddress: text("permanent_address"),
  photoUrl: text("photo_url"),
  openingDueBalance: decimal("opening_due_balance", { precision: 12, scale: 2 }).notNull().default('0'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  leases: many(leases),
  payments: many(payments),
}));

// Leases table
export const leases = pgTable("leases", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  shopId: integer("shop_id").notNull().references(() => shops.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  securityDeposit: decimal("security_deposit", { precision: 12, scale: 2 }).notNull(),
  securityDepositUsed: decimal("security_deposit_used", { precision: 12, scale: 2 }).notNull().default('0'),
  monthlyRent: decimal("monthly_rent", { precision: 12, scale: 2 }).notNull(),
  status: leaseStatusEnum("status").notNull().default('active'),
  notes: text("notes"),
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
}));

// Rent Invoices - monthly rent generation
export const rentInvoices = pgTable("rent_invoices", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  leaseId: integer("lease_id").notNull().references(() => leases.id),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: date("due_date").notNull(),
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  isPaid: boolean("is_paid").notNull().default(false),
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
export const payments = pgTable("payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  leaseId: integer("lease_id").notNull().references(() => leases.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentDate: date("payment_date").notNull(),
  receiptNumber: text("receipt_number"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
export const bankDeposits = pgTable("bank_deposits", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ownerId: integer("owner_id").notNull().references(() => owners.id),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  depositDate: date("deposit_date").notNull(),
  bankName: text("bank_name").notNull(),
  depositSlipRef: text("deposit_slip_ref"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const bankDepositsRelations = relations(bankDeposits, ({ one }) => ({
  owner: one(owners, {
    fields: [bankDeposits.ownerId],
    references: [owners.id],
  }),
}));

// Expenses table
export const expenses = pgTable("expenses", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  expenseType: expenseTypeEnum("expense_type").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  expenseDate: date("expense_date").notNull(),
  allocation: expenseAllocationEnum("allocation").notNull(),
  ownerId: integer("owner_id").references(() => owners.id), // null if common expense
  receiptRef: text("receipt_ref"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  owner: one(owners, {
    fields: [expenses.ownerId],
    references: [owners.id],
  }),
}));

// Settings table - for exchange rate and other configs
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Insert Schemas
export const insertOwnerSchema = createInsertSchema(owners).omit({ id: true });
export const insertShopSchema = createInsertSchema(shops).omit({ id: true });
export const insertTenantSchema = createInsertSchema(tenants).omit({ id: true, createdAt: true });
export const insertLeaseSchema = createInsertSchema(leases).omit({ id: true, createdAt: true });
export const insertRentInvoiceSchema = createInsertSchema(rentInvoices).omit({ id: true, createdAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true });
export const insertBankDepositSchema = createInsertSchema(bankDeposits).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });
export const insertSettingSchema = createInsertSchema(settings).omit({ id: true, updatedAt: true });

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

// Extended types for frontend use with relations
export type ShopWithOwner = Shop & { owner?: Owner };
export type LeaseWithDetails = Lease & { tenant: Tenant; shop: ShopWithOwner };
export type TenantWithDues = Tenant & { 
  totalDue: number; 
  totalPaid: number;
  currentDue: number;
};
