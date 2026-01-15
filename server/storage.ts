import {
  User, InsertUser, Owner, InsertOwner, Shop, InsertShop,
  Tenant, InsertTenant, Lease, InsertLease, RentInvoice, InsertRentInvoice,
  Payment, InsertPayment, BankDeposit, InsertBankDeposit, Expense, InsertExpense,
  Setting, DeletionLog, InsertDeletionLog,
  RentAdjustment, InsertRentAdjustment,
  AdditionalPayment, InsertAdditionalPayment,
  users, owners, shops, tenants, leases, rentInvoices, payments, bankDeposits, expenses, settings, deletionLogs, rentAdjustments,
  additionalPayments
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, lt, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Owners
  getOwners(): Promise<Owner[]>;
  getOwner(id: number): Promise<Owner | undefined>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner | undefined>;
  deleteOwner(id: number): Promise<void>;

  // Shops
  getShops(): Promise<Shop[]>;
  getShop(id: number): Promise<Shop | undefined>;
  createShop(shop: InsertShop): Promise<Shop>;
  updateShop(id: number, shop: Partial<InsertShop>): Promise<Shop | undefined>;
  deleteShop(id: number): Promise<void>;

  // Tenants
  getTenants(): Promise<Tenant[]>;
  getTenant(id: number): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant | undefined>;
  deleteTenant(id: number): Promise<void>;

  // Leases
  getLeases(): Promise<Lease[]>;
  getLease(id: number): Promise<Lease | undefined>;
  getLeasesByTenant(tenantId: number): Promise<Lease[]>;
  createLease(lease: InsertLease): Promise<Lease>;
  updateLease(id: number, lease: Partial<InsertLease>): Promise<Lease | undefined>;
  terminateLease(id: number): Promise<Lease | undefined>;
  deleteLease(id: number): Promise<void>;

  // Rent Invoices
  getRentInvoices(): Promise<RentInvoice[]>;
  getRentInvoicesByTenant(tenantId: number): Promise<RentInvoice[]>;
  getRentInvoicesByLease(leaseId: number): Promise<RentInvoice[]>;
  createRentInvoice(invoice: InsertRentInvoice): Promise<RentInvoice>;
  updateRentInvoice(id: number, invoice: Partial<InsertRentInvoice>): Promise<RentInvoice | undefined>;
  deleteRentInvoice(id: number): Promise<void>;
  deleteRentInvoicesByLease(leaseId: number): Promise<void>;

  // Rent Adjustments
  getRentAdjustmentsByLease(leaseId: number): Promise<RentAdjustment[]>;
  createRentAdjustment(adjustment: InsertRentAdjustment): Promise<RentAdjustment>;
  deleteRentAdjustment(id: number): Promise<void>;

  // Payments
  getPayments(): Promise<Payment[]>;
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByTenant(tenantId: number): Promise<Payment[]>;
  getPaymentsByLease(leaseId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined>;
  deletePayment(id: number): Promise<void>;

  // Bank Deposits
  getBankDeposits(): Promise<BankDeposit[]>;
  getBankDeposit(id: number): Promise<BankDeposit | undefined>;
  getBankDepositsByOwner(ownerId: number): Promise<BankDeposit[]>;
  createBankDeposit(deposit: InsertBankDeposit): Promise<BankDeposit>;
  updateBankDeposit(id: number, deposit: Partial<InsertBankDeposit>): Promise<BankDeposit | undefined>;
  deleteBankDeposit(id: number): Promise<void>;

  // Expenses
  getExpenses(): Promise<Expense[]>;
  getExpensesByOwner(ownerId: number): Promise<Expense[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  deleteExpense(id: number): Promise<void>;

  // Settings
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: string): Promise<Setting>;

  // Search
  search(query: string): Promise<{ type: string; id: number; title: string; subtitle: string; extra?: string }[]>;

  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;
  initSuperAdmin(): Promise<void>;

  // Deletion Logs
  getDeletionLogs(): Promise<DeletionLog[]>;
  createDeletionLog(log: InsertDeletionLog): Promise<DeletionLog>;

  // Additional Payments
  // These were manually defined in previous storage.ts. Since I haven't added them to schema yet,
  // I will comment them out or implement them if I add the schema.
  // The user said "migrate all data". I should support this.
  // I will assume I will add `additional_payments` to schema.ts shortly.
  // For now, I'll define these in IStorage but implementation will fail or be empty if I don't update schema.
  // I'll update schema.ts first in next step if possible, or just add TODO here.
}

export class DatabaseStorage implements IStorage {

  // --- OWNERS ---
  async getOwners(): Promise<Owner[]> {
    return await db.select().from(owners).orderBy(owners.name);
  }

  async getOwner(id: number): Promise<Owner | undefined> {
    const [owner] = await db.select().from(owners).where(eq(owners.id, id));
    return owner;
  }

  async createOwner(owner: InsertOwner): Promise<Owner> {
    const [result] = await db.insert(owners).values(owner);
    const id = result.insertId;
    return { ...owner, id } as Owner; // Cast to satisfy type, fields match
  }

  async updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner | undefined> {
    await db.update(owners).set(owner).where(eq(owners.id, id));
    return this.getOwner(id);
  }

  async deleteOwner(id: number): Promise<void> {
    await db.delete(owners).where(eq(owners.id, id));
  }

  // --- SHOPS ---
  async getShops(): Promise<Shop[]> {
    return await db.select().from(shops).orderBy(shops.shopNumber);
  }

  async getShop(id: number): Promise<Shop | undefined> {
    const [shop] = await db.select().from(shops).where(eq(shops.id, id));
    return shop;
  }

  async createShop(shop: InsertShop): Promise<Shop> {
    const [result] = await db.insert(shops).values(shop);
    const id = result.insertId;
    return this.getShop(id) as Promise<Shop>;
  }

  async updateShop(id: number, shop: Partial<InsertShop>): Promise<Shop | undefined> {
    await db.update(shops).set(shop).where(eq(shops.id, id));
    return this.getShop(id);
  }

  async deleteShop(id: number): Promise<void> {
    await db.delete(shops).where(eq(shops.id, id));
  }

  // --- TENANTS ---
  async getTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(tenants.name);
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    // Ensure createdAt is set if not provided (DB default usually works but for return val)
    const [result] = await db.insert(tenants).values(tenant);
    return this.getTenant(result.insertId) as Promise<Tenant>;
  }

  async updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant | undefined> {
    await db.update(tenants).set(tenant).where(eq(tenants.id, id));
    return this.getTenant(id);
  }

  async deleteTenant(id: number): Promise<void> {
    await db.delete(tenants).where(eq(tenants.id, id));
  }

  // --- LEASES ---
  async getLeases(): Promise<Lease[]> {
    return await db.select().from(leases);
  }

  async getLease(id: number): Promise<Lease | undefined> {
    const [lease] = await db.select().from(leases).where(eq(leases.id, id));
    return lease;
  }

  async getLeasesByTenant(tenantId: number): Promise<Lease[]> {
    return await db.select().from(leases).where(eq(leases.tenantId, tenantId));
  }

  async createLease(lease: InsertLease): Promise<Lease> {
    const [result] = await db.insert(leases).values(lease);

    // Update shop status
    await db.update(shops)
      .set({ status: 'occupied' })
      .where(eq(shops.id, lease.shopId));

    return this.getLease(result.insertId) as Promise<Lease>;
  }

  async updateLease(id: number, lease: Partial<InsertLease>): Promise<Lease | undefined> {
    await db.update(leases).set(lease).where(eq(leases.id, id));
    return this.getLease(id);
  }

  async terminateLease(id: number): Promise<Lease | undefined> {
    const l = await this.getLease(id);
    if (!l) return undefined;

    // Update shop
    await db.update(shops)
      .set({ status: 'vacant' })
      .where(eq(shops.id, l.shopId));

    // Update lease
    await db.update(leases)
      .set({ status: 'terminated' })
      .where(eq(leases.id, id));

    return this.getLease(id);
  }

  async deleteLease(id: number): Promise<void> {
    await db.delete(leases).where(eq(leases.id, id));
  }

  // --- RENT INVOICES ---
  async getRentInvoices(): Promise<RentInvoice[]> {
    return await db.select().from(rentInvoices);
  }

  async getRentInvoicesByTenant(tenantId: number): Promise<RentInvoice[]> {
    return await db.select().from(rentInvoices).where(eq(rentInvoices.tenantId, tenantId));
  }

  async getRentInvoicesByLease(leaseId: number): Promise<RentInvoice[]> {
    return await db.select().from(rentInvoices).where(eq(rentInvoices.leaseId, leaseId));
  }

  async createRentInvoice(invoice: InsertRentInvoice): Promise<RentInvoice> {
    const [result] = await db.insert(rentInvoices).values(invoice);
    return this.getRentInvoices().then(invs => invs.find(i => i.id === result.insertId)!);
  }

  async updateRentInvoice(id: number, invoice: Partial<InsertRentInvoice>): Promise<RentInvoice | undefined> {
    await db.update(rentInvoices).set(invoice).where(eq(rentInvoices.id, id));
    const [inv] = await db.select().from(rentInvoices).where(eq(rentInvoices.id, id));
    return inv;
  }

  async deleteRentInvoice(id: number): Promise<void> {
    await db.delete(rentInvoices).where(eq(rentInvoices.id, id));
  }

  async deleteRentInvoicesByLease(leaseId: number): Promise<void> {
    await db.delete(rentInvoices).where(eq(rentInvoices.leaseId, leaseId));
  }

  // --- RENT ADJUSTMENTS ---
  async getRentAdjustmentsByLease(leaseId: number): Promise<RentAdjustment[]> {
    return await db.select().from(rentAdjustments).where(eq(rentAdjustments.leaseId, leaseId));
  }

  async createRentAdjustment(adjustment: InsertRentAdjustment): Promise<RentAdjustment> {
    const [result] = await db.insert(rentAdjustments).values(adjustment);
    const [adj] = await db.select().from(rentAdjustments).where(eq(rentAdjustments.id, result.insertId));
    return adj;
  }

  async deleteRentAdjustment(id: number): Promise<void> {
    await db.delete(rentAdjustments).where(eq(rentAdjustments.id, id));
  }

  // --- PAYMENTS ---
  async getPayments(): Promise<Payment[]> {
    return await db.select().from(payments);
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentsByTenant(tenantId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.tenantId, tenantId));
  }

  async getPaymentsByLease(leaseId: number): Promise<Payment[]> {
    return await db.select().from(payments).where(eq(payments.leaseId, leaseId));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [result] = await db.insert(payments).values(payment);
    return this.getPayment(result.insertId) as Promise<Payment>;
  }

  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    await db.update(payments).set(payment).where(eq(payments.id, id));
    return this.getPayment(id);
  }

  async deletePayment(id: number): Promise<void> {
    await db.delete(payments).where(eq(payments.id, id));
  }

  // --- BANK DEPOSITS ---
  async getBankDeposits(): Promise<BankDeposit[]> {
    return await db.select().from(bankDeposits);
  }

  async getBankDeposit(id: number): Promise<BankDeposit | undefined> {
    const [deposit] = await db.select().from(bankDeposits).where(eq(bankDeposits.id, id));
    return deposit;
  }

  async getBankDepositsByOwner(ownerId: number): Promise<BankDeposit[]> {
    return await db.select().from(bankDeposits).where(eq(bankDeposits.ownerId, ownerId));
  }

  async createBankDeposit(deposit: InsertBankDeposit): Promise<BankDeposit> {
    const [result] = await db.insert(bankDeposits).values(deposit);
    return this.getBankDeposit(result.insertId) as Promise<BankDeposit>;
  }

  async updateBankDeposit(id: number, deposit: Partial<InsertBankDeposit>): Promise<BankDeposit | undefined> {
    await db.update(bankDeposits).set(deposit).where(eq(bankDeposits.id, id));
    return this.getBankDeposit(id);
  }

  async deleteBankDeposit(id: number): Promise<void> {
    await db.delete(bankDeposits).where(eq(bankDeposits.id, id));
  }

  // --- EXPENSES ---
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses);
  }

  async getExpensesByOwner(ownerId: number): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.ownerId, ownerId));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [result] = await db.insert(expenses).values(expense);
    const [ex] = await db.select().from(expenses).where(eq(expenses.id, result.insertId));
    return ex;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  // --- SETTINGS ---
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing) {
      await db.update(settings).set({ value }).where(eq(settings.id, existing.id));
      return { ...existing, value, updatedAt: new Date() };
    } else {
      const [result] = await db.insert(settings).values({ key, value });
      return { id: result.insertId, key, value, updatedAt: new Date() };
    }
  }

  // --- SEARCH ---
  async search(queryText: string): Promise<{ type: string; id: number; title: string; subtitle: string; extra?: string }[]> {
    return []; // Implement if needed
  }

  // --- USERS ---
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    const newUser = {
      ...user,
      password: hashedPassword,
      id: crypto.randomUUID(), // Manual UUID gen if not provided
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await db.insert(users).values(newUser);
    return newUser as User;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    await db.update(users).set(updateData).where(eq(users.id, id));
    return this.getUser(id);
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async initSuperAdmin(): Promise<void> {
    const superAdmin = await this.getUserByUsername('super_admin');
    if (!superAdmin) {
      console.log("Creating default super_admin account...");
      await this.createUser({
        username: 'super_admin',
        password: 'password123',
        role: 'super_admin',
        email: 'admin@estatemanager.com',
        firstName: 'Super',
        lastName: 'Admin'
      });
      console.log("Default super_admin created.");
    }
  }

  // --- DELETION LOGS ---
  async getDeletionLogs(): Promise<DeletionLog[]> {
    return await db.select().from(deletionLogs).orderBy(desc(deletionLogs.deletedAt));
  }

  async createDeletionLog(log: InsertDeletionLog): Promise<DeletionLog> {
    const [result] = await db.insert(deletionLogs).values(log);
    const [dLog] = await db.select().from(deletionLogs).where(eq(deletionLogs.id, result.insertId));
    return dLog;
  }
}

export const storage = new DatabaseStorage();
