import { eq, and, desc, sql, gte, lte, or, like, ilike } from "drizzle-orm";
import { db } from "./db";
import bcrypt from "bcrypt";
import {
  owners, shops, tenants, leases, rentInvoices, payments, bankDeposits, expenses, settings, users,
  type Owner, type InsertOwner,
  type Shop, type InsertShop,
  type Tenant, type InsertTenant,
  type Lease, type InsertLease,
  type RentInvoice, type InsertRentInvoice,
  type Payment, type InsertPayment,
  type BankDeposit, type InsertBankDeposit,
  type Expense, type InsertExpense,
  type Setting, type InsertSetting,
  type User, type InsertUser,
} from "@shared/schema";

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
  
  // Rent Invoices
  getRentInvoices(): Promise<RentInvoice[]>;
  getRentInvoicesByTenant(tenantId: number): Promise<RentInvoice[]>;
  createRentInvoice(invoice: InsertRentInvoice): Promise<RentInvoice>;
  
  // Payments
  getPayments(): Promise<Payment[]>;
  getPaymentsByTenant(tenantId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  deletePayment(id: number): Promise<void>;
  
  // Bank Deposits
  getBankDeposits(): Promise<BankDeposit[]>;
  getBankDepositsByOwner(ownerId: number): Promise<BankDeposit[]>;
  createBankDeposit(deposit: InsertBankDeposit): Promise<BankDeposit>;
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
}

export class DatabaseStorage implements IStorage {
  // Owners
  async getOwners(): Promise<Owner[]> {
    return db.select().from(owners).orderBy(owners.name);
  }

  async getOwner(id: number): Promise<Owner | undefined> {
    const [owner] = await db.select().from(owners).where(eq(owners.id, id));
    return owner;
  }

  async createOwner(owner: InsertOwner): Promise<Owner> {
    const [created] = await db.insert(owners).values(owner).returning();
    return created;
  }

  async updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner | undefined> {
    const [updated] = await db.update(owners).set(owner).where(eq(owners.id, id)).returning();
    return updated;
  }

  async deleteOwner(id: number): Promise<void> {
    await db.delete(owners).where(eq(owners.id, id));
  }

  // Shops
  async getShops(): Promise<Shop[]> {
    return db.select().from(shops).orderBy(shops.floor, shops.shopNumber);
  }

  async getShop(id: number): Promise<Shop | undefined> {
    const [shop] = await db.select().from(shops).where(eq(shops.id, id));
    return shop;
  }

  async createShop(shop: InsertShop): Promise<Shop> {
    const [created] = await db.insert(shops).values(shop).returning();
    return created;
  }

  async updateShop(id: number, shop: Partial<InsertShop>): Promise<Shop | undefined> {
    const [updated] = await db.update(shops).set(shop).where(eq(shops.id, id)).returning();
    return updated;
  }

  async deleteShop(id: number): Promise<void> {
    await db.delete(shops).where(eq(shops.id, id));
  }

  // Tenants
  async getTenants(): Promise<Tenant[]> {
    return db.select().from(tenants).orderBy(tenants.name);
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [created] = await db.insert(tenants).values(tenant).returning();
    return created;
  }

  async updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants).set(tenant).where(eq(tenants.id, id)).returning();
    return updated;
  }

  async deleteTenant(id: number): Promise<void> {
    await db.delete(tenants).where(eq(tenants.id, id));
  }

  // Leases
  async getLeases(): Promise<Lease[]> {
    return db.select().from(leases).orderBy(desc(leases.createdAt));
  }

  async getLease(id: number): Promise<Lease | undefined> {
    const [lease] = await db.select().from(leases).where(eq(leases.id, id));
    return lease;
  }

  async getLeasesByTenant(tenantId: number): Promise<Lease[]> {
    return db.select().from(leases).where(eq(leases.tenantId, tenantId)).orderBy(desc(leases.startDate));
  }

  async createLease(lease: InsertLease): Promise<Lease> {
    const [created] = await db.insert(leases).values(lease).returning();
    // Update shop status to occupied
    await db.update(shops).set({ status: 'occupied' }).where(eq(shops.id, lease.shopId));
    return created;
  }

  async updateLease(id: number, lease: Partial<InsertLease>): Promise<Lease | undefined> {
    const [updated] = await db.update(leases).set(lease).where(eq(leases.id, id)).returning();
    return updated;
  }

  async terminateLease(id: number): Promise<Lease | undefined> {
    const [lease] = await db.select().from(leases).where(eq(leases.id, id));
    if (!lease) return undefined;
    
    // Update shop status to vacant
    await db.update(shops).set({ status: 'vacant' }).where(eq(shops.id, lease.shopId));
    
    const [updated] = await db.update(leases)
      .set({ status: 'terminated' })
      .where(eq(leases.id, id))
      .returning();
    return updated;
  }

  // Rent Invoices
  async getRentInvoices(): Promise<RentInvoice[]> {
    return db.select().from(rentInvoices).orderBy(desc(rentInvoices.dueDate));
  }

  async getRentInvoicesByTenant(tenantId: number): Promise<RentInvoice[]> {
    return db.select().from(rentInvoices).where(eq(rentInvoices.tenantId, tenantId)).orderBy(desc(rentInvoices.dueDate));
  }

  async createRentInvoice(invoice: InsertRentInvoice): Promise<RentInvoice> {
    const [created] = await db.insert(rentInvoices).values(invoice).returning();
    return created;
  }

  // Payments
  async getPayments(): Promise<Payment[]> {
    return db.select().from(payments).orderBy(desc(payments.paymentDate));
  }

  async getPaymentsByTenant(tenantId: number): Promise<Payment[]> {
    return db.select().from(payments).where(eq(payments.tenantId, tenantId)).orderBy(desc(payments.paymentDate));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db.insert(payments).values(payment).returning();
    return created;
  }

  async deletePayment(id: number): Promise<void> {
    await db.delete(payments).where(eq(payments.id, id));
  }

  // Bank Deposits
  async getBankDeposits(): Promise<BankDeposit[]> {
    return db.select().from(bankDeposits).orderBy(desc(bankDeposits.depositDate));
  }

  async getBankDepositsByOwner(ownerId: number): Promise<BankDeposit[]> {
    return db.select().from(bankDeposits).where(eq(bankDeposits.ownerId, ownerId)).orderBy(desc(bankDeposits.depositDate));
  }

  async createBankDeposit(deposit: InsertBankDeposit): Promise<BankDeposit> {
    const [created] = await db.insert(bankDeposits).values(deposit).returning();
    return created;
  }

  async deleteBankDeposit(id: number): Promise<void> {
    await db.delete(bankDeposits).where(eq(bankDeposits.id, id));
  }

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    return db.select().from(expenses).orderBy(desc(expenses.expenseDate));
  }

  async getExpensesByOwner(ownerId: number): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.ownerId, ownerId)).orderBy(desc(expenses.expenseDate));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [created] = await db.insert(expenses).values(expense).returning();
    return created;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.delete(expenses).where(eq(expenses.id, id));
  }

  // Settings
  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [updated] = await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(settings).values({ key, value }).returning();
    return created;
  }

  // Search
  async search(query: string): Promise<{ type: string; id: number; title: string; subtitle: string; extra?: string }[]> {
    const results: { type: string; id: number; title: string; subtitle: string; extra?: string }[] = [];
    const searchTerm = `%${query}%`;

    // Search tenants
    const tenantResults = await db.select().from(tenants).where(
      or(
        ilike(tenants.name, searchTerm),
        ilike(tenants.phone, searchTerm),
        ilike(tenants.nidPassport, searchTerm)
      )
    ).limit(5);
    
    for (const t of tenantResults) {
      results.push({
        type: 'tenant',
        id: t.id,
        title: t.name,
        subtitle: t.phone,
      });
    }

    // Search shops
    const shopResults = await db.select().from(shops).where(
      ilike(shops.shopNumber, searchTerm)
    ).limit(5);
    
    for (const s of shopResults) {
      results.push({
        type: 'shop',
        id: s.id,
        title: `Shop ${s.shopNumber}`,
        subtitle: `${s.floor} Floor - ${s.status}`,
      });
    }

    // Search leases
    const leaseResults = await db.select().from(leases).where(
      sql`CAST(${leases.id} AS TEXT) LIKE ${searchTerm}`
    ).limit(5);
    
    for (const l of leaseResults) {
      results.push({
        type: 'lease',
        id: l.id,
        title: `Agreement #${l.id}`,
        subtitle: `Status: ${l.status}`,
      });
    }

    return results;
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...userData,
        password: hashedPassword,
      })
      .returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.createdAt);
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async initSuperAdmin(): Promise<void> {
    const existingAdmin = await this.getUserByUsername('super_admin');
    if (!existingAdmin) {
      await this.createUser({
        username: 'super_admin',
        password: 'Empower01#',
        firstName: 'Super',
        lastName: 'Admin',
        role: 'super_admin',
      });
      console.log('Super Admin account created');
    }
  }
}

export const storage = new DatabaseStorage();
