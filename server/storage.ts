import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  User, InsertUser, Owner, InsertOwner, Shop, InsertShop,
  Tenant, InsertTenant, Lease, InsertLease, RentInvoice, InsertRentInvoice,
  Payment, InsertPayment, BankDeposit, InsertBankDeposit, Expense, InsertExpense,
  Setting, DeletionLog, InsertDeletionLog, DeletionRecordType,
  RentAdjustment, InsertRentAdjustment
} from "@shared/schema";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(process.cwd(), "service-account.json");
if (!fs.existsSync(serviceAccountPath)) {
  console.error("CRITICAL: service-account.json not found at " + serviceAccountPath);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

let app;
try {
  app = initializeApp({
    credential: cert(serviceAccount)
  });
} catch (e) {
  // Avoid re-initialization error if hot-reloading
  if (!app) throw e;
}

const db = getFirestore(app);

// Helper for type safety if needed, though Admin SDK types are robust
// We can cast document data

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
  updateLease(id: number, lease: Partial<InsertLease>): Promise<Lease | undefined>;
  terminateLease(id: number): Promise<Lease | undefined>;
  deleteLease(id: number): Promise<void>;
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
  getRentAdjustmentsByLease(leaseId: number): Promise<RentAdjustment[]>;
  createRentAdjustment(adjustment: InsertRentAdjustment): Promise<RentAdjustment>;
  deleteRentAdjustment(id: number): Promise<void>;
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

  // Additional Payments (Financial Statement Only)
  getAdditionalPaymentsByTenant(tenantId: number): Promise<AdditionalPayment[]>;
  getAdditionalPaymentsByOwner(ownerId: number): Promise<AdditionalPayment[]>;
  createAdditionalPayment(payment: InsertAdditionalPayment): Promise<AdditionalPayment>;
  deleteAdditionalPayment(id: number): Promise<void>;
}

// Additional Payment types
export interface AdditionalPayment {
  id: number;
  tenantId: number;
  ownerId: number;
  paymentType: 'advance_adjustment' | 'service_charge' | 'other';
  description: string;
  amount: string;
  paymentDate: string;
  notes?: string;
  createdAt: string;
  isDeleted?: boolean;
}

export type InsertAdditionalPayment = Omit<AdditionalPayment, 'id' | 'createdAt'>;

export class FirebaseStorage implements IStorage {

  // Helper to get next numeric ID for a collection
  private async getNextId(collectionName: string): Promise<number> {
    const snapshot = await db.collection(collectionName)
      .orderBy('id', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return 1;
    const data = snapshot.docs[0].data();
    return (Number(data.id) || 0) + 1;
  }

  // Generic mapper not strictly needed with Admin SDK, but helpful for consistency
  // Admin SDK data() returns Record<string, any>
  private mapDoc<T>(doc: FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot): T {
    const data = doc.data();
    return data as T;
  }

  // --- OWNERS ---
  async getOwners(): Promise<Owner[]> {
    const snapshot = await db.collection('owners').orderBy('name').get();
    return snapshot.docs.map(doc => this.mapDoc<Owner>(doc));
  }

  async getOwner(id: number): Promise<Owner | undefined> {
    const docRef = db.collection('owners').doc(String(id));
    const d = await docRef.get();
    return d.exists ? this.mapDoc<Owner>(d) : undefined;
  }

  async createOwner(owner: InsertOwner): Promise<Owner> {
    const id = await this.getNextId('owners');
    const newOwner: Owner = {
      ...owner,
      id,
      phone: owner.phone || null,
      email: owner.email || null,
      address: owner.address || null,
      bankName: owner.bankName || null,
      bankAccountNumber: owner.bankAccountNumber || null,
      bankBranch: owner.bankBranch || null
    };
    await db.collection('owners').doc(String(id)).set(newOwner);
    return newOwner;
  }

  async updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner | undefined> {
    const docRef = db.collection('owners').doc(String(id));
    const d = await docRef.get();
    if (!d.exists) return undefined;
    await docRef.update(owner);
    return this.getOwner(id);
  }

  async deleteOwner(id: number): Promise<void> {
    await db.collection('owners').doc(String(id)).delete();
  }

  // --- SHOPS ---
  async getShops(): Promise<Shop[]> {
    const snapshot = await db.collection('shops').get();
    const shops = snapshot.docs.map(d => this.mapDoc<Shop>(d));
    return shops.sort((a, b) => a.shopNumber.localeCompare(b.shopNumber));
  }

  async getShop(id: number): Promise<Shop | undefined> {
    const d = await db.collection('shops').doc(String(id)).get();
    return d.exists ? this.mapDoc<Shop>(d) : undefined;
  }

  async createShop(shop: InsertShop): Promise<Shop> {
    const id = await this.getNextId('shops');
    const newShop: Shop = {
      ...shop,
      id,
      subedariCategory: shop.subedariCategory || null,
      squareFeet: shop.squareFeet || null,
      status: shop.status || 'vacant',
      ownerId: shop.ownerId || null,
      description: shop.description || null,
      deletedAt: null,
      deletionReason: null,
      deletedBy: null,
      isDeleted: false
    };
    await db.collection('shops').doc(String(id)).set(newShop);
    return newShop;
  }

  async updateShop(id: number, shop: Partial<InsertShop>): Promise<Shop | undefined> {
    const docRef = db.collection('shops').doc(String(id));
    const d = await docRef.get();
    if (!d.exists) return undefined;
    await docRef.update(shop);
    return this.getShop(id);
  }

  async deleteShop(id: number): Promise<void> {
    await db.collection('shops').doc(String(id)).delete();
  }

  // --- TENANTS ---
  async getTenants(): Promise<Tenant[]> {
    const snapshot = await db.collection('tenants').orderBy('name').get();
    return snapshot.docs.map(d => this.mapDoc<Tenant>(d));
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const d = await db.collection('tenants').doc(String(id)).get();
    return d.exists ? this.mapDoc<Tenant>(d) : undefined;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const id = await this.getNextId('tenants');
    // Admin SDK timestamps issue: converting Date to plain object or string if needed
    // But Firestore Admin usually handles JS Date objects fine.
    // Client SDK sometimes preferred Timestamp. 
    // We'll keep using Date objects as the schema demands strings or dates.
    // However, schema says createdAt is Date.

    const newTenant: Tenant = {
      ...tenant,
      id,
      email: tenant.email || null,
      businessName: tenant.businessName || null,
      nidPassport: tenant.nidPassport || null,
      permanentAddress: tenant.permanentAddress || null,
      photoUrl: tenant.photoUrl || null,
      openingDueBalance: tenant.openingDueBalance || "0",
      createdAt: new Date(),
      deletedAt: null,
      deletionReason: null,
      deletedBy: null,
      isDeleted: false
    };
    // JSON.parse(JSON.stringify) helps remove undefined and handle date serialization if any issues
    await db.collection('tenants').doc(String(id)).set(JSON.parse(JSON.stringify(newTenant)));
    return newTenant;
  }

  async updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const docRef = db.collection('tenants').doc(String(id));
    const d = await docRef.get();
    if (!d.exists) return undefined;
    await docRef.update(tenant);
    return this.getTenant(id);
  }

  async deleteTenant(id: number): Promise<void> {
    await db.collection('tenants').doc(String(id)).delete();
  }

  // --- LEASES ---
  async getLeases(): Promise<Lease[]> {
    const snapshot = await db.collection('leases').get();
    return snapshot.docs.map(d => this.mapDoc<Lease>(d));
  }

  async getLease(id: number): Promise<Lease | undefined> {
    const d = await db.collection('leases').doc(String(id)).get();
    return d.exists ? this.mapDoc<Lease>(d) : undefined;
  }

  async getLeasesByTenant(tenantId: number): Promise<Lease[]> {
    const snapshot = await db.collection('leases').where('tenantId', '==', tenantId).get();
    return snapshot.docs.map(d => this.mapDoc<Lease>(d));
  }

  async createLease(lease: InsertLease): Promise<Lease> {
    const id = await this.getNextId('leases');
    const newLease: Lease = {
      ...lease,
      id,
      securityDepositUsed: lease.securityDepositUsed || "0",
      openingDueBalance: lease.openingDueBalance || "0",
      status: lease.status || 'active',
      notes: lease.notes || null,
      terminationNotes: lease.terminationNotes || null,
      createdAt: new Date()
    };
    await db.collection('leases').doc(String(id)).set(JSON.parse(JSON.stringify(newLease)));

    // Update shop status
    await db.collection('shops').doc(String(lease.shopId)).update({ status: 'occupied' });

    return newLease;
  }

  async updateLease(id: number, lease: Partial<InsertLease>): Promise<Lease | undefined> {
    const docRef = db.collection('leases').doc(String(id));
    const d = await docRef.get();
    if (!d.exists) return undefined;
    await docRef.update(lease);
    return this.getLease(id);
  }

  async terminateLease(id: number): Promise<Lease | undefined> {
    const l = await this.getLease(id);
    if (!l) return undefined;

    // Update shop
    await db.collection('shops').doc(String(l.shopId)).update({ status: 'vacant' });

    // Update lease
    await db.collection('leases').doc(String(id)).update({ status: 'terminated' });

    return this.getLease(id);
  }

  async deleteLease(id: number): Promise<void> {
    await db.collection('leases').doc(String(id)).delete();
  }

  // --- RENT INVOICES ---
  async getRentInvoices(): Promise<RentInvoice[]> {
    const snapshot = await db.collection('invoices').get();
    return snapshot.docs.map(d => this.mapDoc<RentInvoice>(d));
  }

  async getRentInvoicesByTenant(tenantId: number): Promise<RentInvoice[]> {
    const snapshot = await db.collection('invoices').where('tenantId', '==', tenantId).get();
    return snapshot.docs.map(d => this.mapDoc<RentInvoice>(d));
  }

  async getRentInvoicesByLease(leaseId: number): Promise<RentInvoice[]> {
    const snapshot = await db.collection('invoices').where('leaseId', '==', leaseId).get();
    return snapshot.docs.map(d => this.mapDoc<RentInvoice>(d));
  }

  async createRentInvoice(invoice: InsertRentInvoice): Promise<RentInvoice> {
    const id = await this.getNextId('invoices');
    const newInvoice: RentInvoice = {
      ...invoice,
      id,
      isPaid: false,
      paidAmount: "0",
      createdAt: new Date()
    };
    await db.collection('invoices').doc(String(id)).set(JSON.parse(JSON.stringify(newInvoice)));
    return newInvoice;
  }

  async updateRentInvoice(id: number, invoice: Partial<InsertRentInvoice>): Promise<RentInvoice | undefined> {
    const docRef = db.collection('invoices').doc(String(id));
    const d = await docRef.get();
    if (!d.exists) return undefined;
    await docRef.update(invoice);
    return (await docRef.get()).data() as RentInvoice;
  }

  async deleteRentInvoice(id: number): Promise<void> {
    await db.collection('invoices').doc(String(id)).delete();
  }

  async deleteRentInvoicesByLease(leaseId: number): Promise<void> {
    const snapshot = await db.collection('invoices').where('leaseId', '==', leaseId).get();
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  // --- RENT ADJUSTMENTS ---
  async getRentAdjustmentsByLease(leaseId: number): Promise<RentAdjustment[]> {
    const snapshot = await db.collection('rentAdjustments').where('leaseId', '==', leaseId).get();
    return snapshot.docs.map(d => this.mapDoc<RentAdjustment>(d));
  }

  async createRentAdjustment(adjustment: InsertRentAdjustment): Promise<RentAdjustment> {
    const id = await this.getNextId('rentAdjustments');
    const newAdjustment: RentAdjustment = {
      ...adjustment,
      id,
      agreementTerms: adjustment.agreementTerms || null,
      notes: adjustment.notes || null,
      createdAt: new Date()
    };
    await db.collection('rentAdjustments').doc(String(id)).set(JSON.parse(JSON.stringify(newAdjustment)));
    return newAdjustment;
  }

  async deleteRentAdjustment(id: number): Promise<void> {
    await db.collection('rentAdjustments').doc(String(id)).delete();
  }

  // --- PAYMENTS ---
  async getPayments(): Promise<Payment[]> {
    const snapshot = await db.collection('payments').get();
    return snapshot.docs.map(d => this.mapDoc<Payment>(d));
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const d = await db.collection('payments').doc(String(id)).get();
    return d.exists ? this.mapDoc<Payment>(d) : undefined;
  }

  async getPaymentsByTenant(tenantId: number): Promise<Payment[]> {
    const snapshot = await db.collection('payments').where('tenantId', '==', tenantId).get();
    return snapshot.docs.map(d => this.mapDoc<Payment>(d));
  }

  async getPaymentsByLease(leaseId: number): Promise<Payment[]> {
    const snapshot = await db.collection('payments').where('leaseId', '==', leaseId).get();
    return snapshot.docs.map(d => this.mapDoc<Payment>(d));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = await this.getNextId('payments');
    const newPayment: Payment = {
      ...payment,
      id,
      receiptNumber: payment.receiptNumber || null,
      notes: payment.notes || null,
      createdAt: new Date(),
      deletedAt: null,
      deletionReason: null,
      deletedBy: null,
      isDeleted: false
    };
    await db.collection('payments').doc(String(id)).set(JSON.parse(JSON.stringify(newPayment)));
    return newPayment;
  }

  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const docRef = db.collection('payments').doc(String(id));
    const d = await docRef.get();
    if (!d.exists) return undefined;
    await docRef.update(payment);
    return (await docRef.get()).data() as Payment;
  }

  async deletePayment(id: number): Promise<void> {
    await db.collection('payments').doc(String(id)).delete();
  }

  // --- BANK DEPOSITS ---
  async getBankDeposits(): Promise<BankDeposit[]> {
    const snapshot = await db.collection('bankDeposits').get();
    return snapshot.docs.map(d => this.mapDoc<BankDeposit>(d));
  }

  async getBankDeposit(id: number): Promise<BankDeposit | undefined> {
    const d = await db.collection('bankDeposits').doc(String(id)).get();
    return d.exists ? this.mapDoc<BankDeposit>(d) : undefined;
  }

  async getBankDepositsByOwner(ownerId: number): Promise<BankDeposit[]> {
    const snapshot = await db.collection('bankDeposits').where('ownerId', '==', ownerId).get();
    return snapshot.docs.map(d => this.mapDoc<BankDeposit>(d));
  }

  async createBankDeposit(deposit: InsertBankDeposit): Promise<BankDeposit> {
    const id = await this.getNextId('bankDeposits');
    const newDeposit: BankDeposit = {
      ...deposit,
      id,
      depositSlipRef: deposit.depositSlipRef || null,
      notes: deposit.notes || null,
      createdAt: new Date(),
      deletedAt: null,
      deletionReason: null,
      deletedBy: null,
      isDeleted: false
    };
    await db.collection('bankDeposits').doc(String(id)).set(JSON.parse(JSON.stringify(newDeposit)));
    return newDeposit;
  }

  async updateBankDeposit(id: number, deposit: Partial<InsertBankDeposit>): Promise<BankDeposit | undefined> {
    const docRef = db.collection('bankDeposits').doc(String(id));
    const d = await docRef.get();
    if (!d.exists) return undefined;
    await docRef.update(deposit);
    return (await docRef.get()).data() as BankDeposit;
  }

  async deleteBankDeposit(id: number): Promise<void> {
    await db.collection('bankDeposits').doc(String(id)).delete();
  }

  // --- EXPENSES ---
  async getExpenses(): Promise<Expense[]> {
    const snapshot = await db.collection('expenses').get();
    return snapshot.docs.map(d => this.mapDoc<Expense>(d));
  }

  async getExpensesByOwner(ownerId: number): Promise<Expense[]> {
    const snapshot = await db.collection('expenses').where('ownerId', '==', ownerId).get();
    return snapshot.docs.map(d => this.mapDoc<Expense>(d));
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = await this.getNextId('expenses');
    const newExpense: Expense = {
      ...expense,
      id,
      ownerId: expense.ownerId || null,
      receiptRef: expense.receiptRef || null,
      createdAt: new Date()
    };
    await db.collection('expenses').doc(String(id)).set(JSON.parse(JSON.stringify(newExpense)));
    return newExpense;
  }

  async deleteExpense(id: number): Promise<void> {
    await db.collection('expenses').doc(String(id)).delete();
  }

  // --- SETTINGS ---
  async getSetting(key: string): Promise<Setting | undefined> {
    const snapshot = await db.collection('settings').where('key', '==', key).get();
    if (snapshot.empty) return undefined;
    return this.mapDoc<Setting>(snapshot.docs[0]);
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const docRef = db.collection('settings').doc(String(existing.id));
      const updated = { value, updatedAt: new Date() };
      await docRef.update(updated);
      return { ...existing, ...updated };
    } else {
      const id = await this.getNextId('settings');
      const newSetting: Setting = {
        id,
        key,
        value,
        updatedAt: new Date()
      };
      await db.collection('settings').doc(String(id)).set(JSON.parse(JSON.stringify(newSetting)));
      return newSetting;
    }
  }

  // --- SEARCH ---
  async search(queryText: string): Promise<{ type: string; id: number; title: string; subtitle: string; extra?: string }[]> {
    return [];
  }

  // --- USERS ---
  async getUser(id: string): Promise<User | undefined> {
    const d = await db.collection('users').doc(id).get();
    if (!d.exists) return undefined;
    const data = this.mapDoc<User>(d);
    return { ...data, id: d.id };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const snapshot = await db.collection('users').where('username', '==', username).get();
    if (snapshot.empty) return undefined;
    const d = snapshot.docs[0];
    const data = this.mapDoc<User>(d);
    return { ...data, id: d.id };
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUser: User = {
      ...userData,
      id,
      password: hashedPassword,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      phone: userData.phone || null,
      ownerId: userData.ownerId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      role: userData.role || 'owner'
    };
    await db.collection('users').doc(id).set(JSON.parse(JSON.stringify(newUser)));
    return newUser;
  }

  async getUsers(): Promise<User[]> {
    const snapshot = await db.collection('users').get();
    return snapshot.docs.map(d => ({ ...this.mapDoc<User>(d), id: d.id }));
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const docRef = db.collection('users').doc(id);
    const d = await docRef.get();
    if (!d.exists) return undefined;

    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    await docRef.update(updateData);
    return this.getUser(id);
  }

  async deleteUser(id: string): Promise<void> {
    await db.collection('users').doc(id).delete();
  }

  async initSuperAdmin(): Promise<void> {
    // Check if super_admin exists
    const superAdmin = await this.getUserByUsername('super_admin');
    if (!superAdmin) {
      console.log("Creating default super_admin account...");
      await this.createUser({
        username: 'super_admin',
        password: 'password123', // Initial password, should be changed
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
    const snapshot = await db.collection('deletionLogs').get();
    return snapshot.docs.map(d => this.mapDoc<DeletionLog>(d));
  }

  async createDeletionLog(log: InsertDeletionLog): Promise<DeletionLog> {
    const id = await this.getNextId('deletionLogs');
    const newLog: DeletionLog = {
      ...log,
      id,
      deletedAt: new Date()
    };
    await db.collection('deletionLogs').doc(String(id)).set(JSON.parse(JSON.stringify(newLog)));
    return newLog;
  }

  // --- ADDITIONAL PAYMENTS (Financial Statement Only) ---
  async getAdditionalPaymentsByTenant(tenantId: number): Promise<AdditionalPayment[]> {
    const snapshot = await db.collection('additionalPayments').get();
    // In efficient Firestore usage, filtering should be done in database query, 
    // but schema support not guaranteed, so sticking to original logic logic for now 
    // or improving if collection exists. 
    // Previous code was fetch all then filter, implying maybe specific index missing or small dataset.
    // Let's optimize:
    // Actually, client code filtered 'additionalPayments' collection.

    // We can try to query directly:
    // const snapshot = await db.collection('additionalPayments').where('tenantId', '==', tenantId).get();
    // But then we need to handle 'isDeleted'.

    // Let's stick to fetch all and filter to match previous behavior exactly if we are unsure about indexes,
    // but Admin SDK is powerful. 
    // Original: getDocs(collection(db, 'additionalPayments')) then JS filter.
    const all = snapshot.docs.map(d => d.data() as AdditionalPayment);
    return all.filter(p => p.tenantId === tenantId && !p.isDeleted);
  }

  async getAdditionalPaymentsByOwner(ownerId: number): Promise<AdditionalPayment[]> {
    const snapshot = await db.collection('additionalPayments').get();
    const all = snapshot.docs.map(d => d.data() as AdditionalPayment);
    return all.filter(p => p.ownerId === ownerId && !p.isDeleted);
  }

  async createAdditionalPayment(payment: InsertAdditionalPayment): Promise<AdditionalPayment> {
    const id = await this.getNextId('additionalPayments');
    const newPayment: AdditionalPayment = {
      ...payment,
      id,
      createdAt: new Date().toISOString()
    };
    await db.collection('additionalPayments').doc(String(id)).set(JSON.parse(JSON.stringify(newPayment)));
    return newPayment;
  }

  async deleteAdditionalPayment(id: number): Promise<void> {
    const snapshot = await db.collection('additionalPayments').where('id', '==', id).get();
    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      await docRef.update({ isDeleted: true });
    }
  }
}

export const storage = new FirebaseStorage();
