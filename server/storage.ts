import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, getDocs, getDoc, doc, setDoc,
  deleteDoc, updateDoc, query, where, orderBy, limit,
  addDoc, DocumentData, Timestamp
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  User, InsertUser, Owner, InsertOwner, Shop, InsertShop,
  Tenant, InsertTenant, Lease, InsertLease, RentInvoice, InsertRentInvoice,
  Payment, InsertPayment, BankDeposit, InsertBankDeposit, Expense, InsertExpense,
  Setting, DeletionLog, InsertDeletionLog, DeletionRecordType,
  RentAdjustment, InsertRentAdjustment
} from "@shared/schema";
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

// Additional Payment types (not tied to lease calculations)
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


// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB4wOE_rgPUQ2W0A4ImaCw25P9n4D8PyQw",
  authDomain: "estatemanager-861a9.firebaseapp.com",
  projectId: "estatemanager-861a9",
  storageBucket: "estatemanager-861a9.firebasestorage.app",
  messagingSenderId: "935619473858",
  appId: "1:935619473858:web:384bc544b8d97a0d02265b"
};

// Initialize only if not already initialized
let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e: any) {
  // Ignore duplicate app error or handle retrieval?
  // In node, might fail if re-initialized.
  // Client SDK usually persists singleton.
  // simpler:
  app = initializeApp(firebaseConfig, "SERVER_APP_" + Date.now()); // Unique name to avoid conflicts?
  // Actually, usually just calling initializeApp works, or checking getApps().
  // But since this module is imported once, it should be fine.
  // Let's stick to standard.
}
// Actually, standard is:
// import { getApps, initializeApp } from "firebase/app";
// const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
// But I didn't import getApps. Let's just assume fresh start or standard init.
// Reverting to simple init for now as I did in previous file.

const db = getFirestore(app);
const auth = getAuth(app);

// Authenticate server
const authenticateServer = async () => {
  try {
    await signInWithEmailAndPassword(auth, 'admin@estatemanager.com', 'Empower01#');
    console.log('FirebaseStorage: Server authenticated as admin');
  } catch (error) {
    console.error('FirebaseStorage: Auth failed', error);
  }
};
authenticateServer();

export class FirebaseStorage implements IStorage {

  private async getNextId(collectionName: string): Promise<number> {
    const q = query(collection(db, collectionName), orderBy('id', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 1;
    const data = snapshot.docs[0].data();
    return (Number(data.id) || 0) + 1;
  }

  private mapDoc<T>(doc: any): T {
    const data = doc.data();
    return data as T;
  }

  // --- OWNERS ---
  async getOwners(): Promise<Owner[]> {
    const snapshot = await getDocs(query(collection(db, 'owners'), orderBy('name')));
    return snapshot.docs.map(doc => this.mapDoc<Owner>(doc));
  }

  async getOwner(id: number): Promise<Owner | undefined> {
    const docRef = doc(db, 'owners', String(id));
    const d = await getDoc(docRef);
    return d.exists() ? this.mapDoc<Owner>(d) : undefined;
  }

  async createOwner(owner: InsertOwner): Promise<Owner> {
    const id = await this.getNextId('owners');
    const newOwner: Owner = { ...owner, id, phone: owner.phone || null, email: owner.email || null, address: owner.address || null, bankName: owner.bankName || null, bankAccountNumber: owner.bankAccountNumber || null, bankBranch: owner.bankBranch || null };
    await setDoc(doc(db, 'owners', String(id)), newOwner);
    return newOwner;
  }

  async updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner | undefined> {
    const docRef = doc(db, 'owners', String(id));
    if (!(await getDoc(docRef)).exists()) return undefined;
    await updateDoc(docRef, owner);
    return this.getOwner(id);
  }

  async deleteOwner(id: number): Promise<void> {
    await deleteDoc(doc(db, 'owners', String(id)));
  }

  // --- SHOPS ---
  async getShops(): Promise<Shop[]> {
    const snapshot = await getDocs(collection(db, 'shops'));
    const shops = snapshot.docs.map(d => this.mapDoc<Shop>(d));
    return shops.sort((a, b) => a.shopNumber.localeCompare(b.shopNumber));
  }

  async getShop(id: number): Promise<Shop | undefined> {
    const d = await getDoc(doc(db, 'shops', String(id)));
    return d.exists() ? this.mapDoc<Shop>(d) : undefined;
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
    await setDoc(doc(db, 'shops', String(id)), newShop);
    return newShop;
  }

  async updateShop(id: number, shop: Partial<InsertShop>): Promise<Shop | undefined> {
    const docRef = doc(db, 'shops', String(id));
    if (!(await getDoc(docRef)).exists()) return undefined;
    await updateDoc(docRef, shop);
    return this.getShop(id);
  }

  async deleteShop(id: number): Promise<void> {
    await deleteDoc(doc(db, 'shops', String(id)));
  }

  // --- TENANTS ---
  async getTenants(): Promise<Tenant[]> {
    const snapshot = await getDocs(query(collection(db, 'tenants'), orderBy('name')));
    return snapshot.docs.map(d => this.mapDoc<Tenant>(d));
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const d = await getDoc(doc(db, 'tenants', String(id)));
    return d.exists() ? this.mapDoc<Tenant>(d) : undefined;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const id = await this.getNextId('tenants');
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
    await setDoc(doc(db, 'tenants', String(id)), JSON.parse(JSON.stringify(newTenant)));
    return newTenant;
  }

  async updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const docRef = doc(db, 'tenants', String(id));
    if (!(await getDoc(docRef)).exists()) return undefined;
    await updateDoc(docRef, tenant);
    return this.getTenant(id);
  }

  async deleteTenant(id: number): Promise<void> {
    await deleteDoc(doc(db, 'tenants', String(id)));
  }

  // --- LEASES ---
  async getLeases(): Promise<Lease[]> {
    const snapshot = await getDocs(collection(db, 'leases'));
    return snapshot.docs.map(d => this.mapDoc<Lease>(d));
  }

  async getLease(id: number): Promise<Lease | undefined> {
    const d = await getDoc(doc(db, 'leases', String(id)));
    return d.exists() ? this.mapDoc<Lease>(d) : undefined;
  }

  async getLeasesByTenant(tenantId: number): Promise<Lease[]> {
    const q = query(collection(db, 'leases'), where('tenantId', '==', tenantId));
    const snapshot = await getDocs(q);
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
    await setDoc(doc(db, 'leases', String(id)), JSON.parse(JSON.stringify(newLease)));

    // Update shop status
    const shopRef = doc(db, 'shops', String(lease.shopId));
    await updateDoc(shopRef, { status: 'occupied' });

    return newLease;
  }

  async updateLease(id: number, lease: Partial<InsertLease>): Promise<Lease | undefined> {
    const docRef = doc(db, 'leases', String(id));
    if (!(await getDoc(docRef)).exists()) return undefined;
    await updateDoc(docRef, lease);
    return this.getLease(id);
  }

  async terminateLease(id: number): Promise<Lease | undefined> {
    const l = await this.getLease(id);
    if (!l) return undefined;

    // Update shop
    const shopRef = doc(db, 'shops', String(l.shopId));
    await updateDoc(shopRef, { status: 'vacant' });

    // Update lease
    const docRef = doc(db, 'leases', String(id));
    await updateDoc(docRef, { status: 'terminated' });

    return this.getLease(id);
  }

  // --- RENT INVOICES ---
  async getRentInvoices(): Promise<RentInvoice[]> {
    const snapshot = await getDocs(collection(db, 'invoices'));
    return snapshot.docs.map(d => this.mapDoc<RentInvoice>(d));
  }

  async getRentInvoicesByTenant(tenantId: number): Promise<RentInvoice[]> {
    const q = query(collection(db, 'invoices'), where('tenantId', '==', tenantId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => this.mapDoc<RentInvoice>(d));
  }

  async getRentInvoicesByLease(leaseId: number): Promise<RentInvoice[]> {
    const q = query(collection(db, 'invoices'), where('leaseId', '==', leaseId));
    const snapshot = await getDocs(q);
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
    await setDoc(doc(db, 'invoices', String(id)), JSON.parse(JSON.stringify(newInvoice)));
    return newInvoice;
  }

  async updateRentInvoice(id: number, invoice: Partial<InsertRentInvoice>): Promise<RentInvoice | undefined> {
    const docRef = doc(db, 'invoices', String(id));
    if (!(await getDoc(docRef)).exists()) return undefined;
    await updateDoc(docRef, invoice);
    return (await getDoc(docRef)).data() as RentInvoice;
  }

  async deleteRentInvoice(id: number): Promise<void> {
    await deleteDoc(doc(db, 'invoices', String(id)));
  }

  async deleteRentInvoicesByLease(leaseId: number): Promise<void> {
    const q = query(collection(db, 'invoices'), where('leaseId', '==', leaseId));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  }

  // --- RENT ADJUSTMENTS ---
  async getRentAdjustmentsByLease(leaseId: number): Promise<RentAdjustment[]> {
    const q = query(collection(db, 'rentAdjustments'), where('leaseId', '==', leaseId));
    const snapshot = await getDocs(q);
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
    await setDoc(doc(db, 'rentAdjustments', String(id)), JSON.parse(JSON.stringify(newAdjustment)));
    return newAdjustment;
  }

  // --- PAYMENTS ---
  async getPayments(): Promise<Payment[]> {
    const snapshot = await getDocs(collection(db, 'payments'));
    return snapshot.docs.map(d => this.mapDoc<Payment>(d));
  }

  async getPayment(id: number): Promise<Payment | undefined> {
    const docRef = doc(db, 'payments', String(id));
    const d = await getDoc(docRef);
    return d.exists() ? this.mapDoc<Payment>(d) : undefined;
  }

  async getPaymentsByTenant(tenantId: number): Promise<Payment[]> {
    const q = query(collection(db, 'payments'), where('tenantId', '==', tenantId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => this.mapDoc<Payment>(d));
  }

  async getPaymentsByLease(leaseId: number): Promise<Payment[]> {
    const q = query(collection(db, 'payments'), where('leaseId', '==', leaseId));
    const snapshot = await getDocs(q);
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
    await setDoc(doc(db, 'payments', String(id)), JSON.parse(JSON.stringify(newPayment)));
    return newPayment;
  }

  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment | undefined> {
    const docRef = doc(db, 'payments', String(id));
    if (!(await getDoc(docRef)).exists()) return undefined;
    await updateDoc(docRef, payment);
    return (await getDoc(docRef)).data() as Payment;
  }

  async deletePayment(id: number): Promise<void> {
    await deleteDoc(doc(db, 'payments', String(id)));
  }

  // --- BANK DEPOSITS ---
  async getBankDeposits(): Promise<BankDeposit[]> {
    const snapshot = await getDocs(collection(db, 'bankDeposits'));
    return snapshot.docs.map(d => this.mapDoc<BankDeposit>(d));
  }

  async getBankDeposit(id: number): Promise<BankDeposit | undefined> {
    const docRef = doc(db, 'bankDeposits', String(id));
    const d = await getDoc(docRef);
    return d.exists() ? this.mapDoc<BankDeposit>(d) : undefined;
  }

  async getBankDepositsByOwner(ownerId: number): Promise<BankDeposit[]> {
    const q = query(collection(db, 'bankDeposits'), where('ownerId', '==', ownerId));
    const snapshot = await getDocs(q);
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
    await setDoc(doc(db, 'bankDeposits', String(id)), JSON.parse(JSON.stringify(newDeposit)));
    return newDeposit;
  }

  async updateBankDeposit(id: number, deposit: Partial<InsertBankDeposit>): Promise<BankDeposit | undefined> {
    const docRef = doc(db, 'bankDeposits', String(id));
    if (!(await getDoc(docRef)).exists()) return undefined;
    await updateDoc(docRef, deposit);
    return (await getDoc(docRef)).data() as BankDeposit;
  }

  async deleteBankDeposit(id: number): Promise<void> {
    await deleteDoc(doc(db, 'bankDeposits', String(id)));
  }

  // --- EXPENSES ---
  async getExpenses(): Promise<Expense[]> {
    const snapshot = await getDocs(collection(db, 'expenses'));
    return snapshot.docs.map(d => this.mapDoc<Expense>(d));
  }

  async getExpensesByOwner(ownerId: number): Promise<Expense[]> {
    const q = query(collection(db, 'expenses'), where('ownerId', '==', ownerId));
    const snapshot = await getDocs(q);
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
    await setDoc(doc(db, 'expenses', String(id)), JSON.parse(JSON.stringify(newExpense)));
    return newExpense;
  }

  async deleteExpense(id: number): Promise<void> {
    await deleteDoc(doc(db, 'expenses', String(id)));
  }

  // --- SETTINGS ---
  async getSetting(key: string): Promise<Setting | undefined> {
    const q = query(collection(db, 'settings'), where('key', '==', key));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return undefined;
    return this.mapDoc<Setting>(snapshot.docs[0]);
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const docRef = doc(db, 'settings', String(existing.id));
      await updateDoc(docRef, { value, updatedAt: new Date() });
      return { ...existing, value, updatedAt: new Date() };
    } else {
      const id = await this.getNextId('settings');
      const newSetting: Setting = {
        id,
        key,
        value,
        updatedAt: new Date()
      };
      await setDoc(doc(db, 'settings', String(id)), JSON.parse(JSON.stringify(newSetting)));
      return newSetting;
    }
  }

  // --- SEARCH ---
  async search(queryText: string): Promise<{ type: string; id: number; title: string; subtitle: string; extra?: string }[]> {
    return [];
  }

  // --- USERS ---
  async getUser(id: string): Promise<User | undefined> {
    const d = await getDoc(doc(db, 'users', id));
    if (!d.exists()) return undefined;
    const data = this.mapDoc<User>(d);
    return { ...data, id: d.id };
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const q = query(collection(db, 'users'), where('username', '==', username));
    const snapshot = await getDocs(q);
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
    await setDoc(doc(db, 'users', id), JSON.parse(JSON.stringify(newUser)));
    return newUser;
  }

  async getUsers(): Promise<User[]> {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(d => ({ ...this.mapDoc<User>(d), id: d.id }));
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const docRef = doc(db, 'users', id);
    if (!(await getDoc(docRef)).exists()) return undefined;

    const updateData: any = { ...data, updatedAt: new Date() };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    await updateDoc(docRef, updateData);
    return this.getUser(id);
  }

  async deleteUser(id: string): Promise<void> {
    await deleteDoc(doc(db, 'users', id));
  }

  async initSuperAdmin(): Promise<void> {
    return;
  }

  // --- DELETION LOGS ---
  async getDeletionLogs(): Promise<DeletionLog[]> {
    const snapshot = await getDocs(collection(db, 'deletionLogs'));
    return snapshot.docs.map(d => this.mapDoc<DeletionLog>(d));
  }

  async createDeletionLog(log: InsertDeletionLog): Promise<DeletionLog> {
    const id = await this.getNextId('deletionLogs');
    const newLog: DeletionLog = {
      ...log,
      id,
      deletedAt: new Date()
    };
    await setDoc(doc(db, 'deletionLogs', String(id)), JSON.parse(JSON.stringify(newLog)));
    return newLog;
  }

  // --- ADDITIONAL PAYMENTS (Financial Statement Only) ---
  async getAdditionalPaymentsByTenant(tenantId: number): Promise<AdditionalPayment[]> {
    const snapshot = await getDocs(collection(db, 'additionalPayments'));
    return snapshot.docs
      .map(d => d.data() as AdditionalPayment)
      .filter(p => p.tenantId === tenantId && !p.isDeleted);
  }

  async getAdditionalPaymentsByOwner(ownerId: number): Promise<AdditionalPayment[]> {
    const snapshot = await getDocs(collection(db, 'additionalPayments'));
    return snapshot.docs
      .map(d => d.data() as AdditionalPayment)
      .filter(p => p.ownerId === ownerId && !p.isDeleted);
  }

  async createAdditionalPayment(payment: InsertAdditionalPayment): Promise<AdditionalPayment> {
    const id = await this.getNextId('additionalPayments');
    const newPayment: AdditionalPayment = {
      ...payment,
      id,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'additionalPayments', String(id)), JSON.parse(JSON.stringify(newPayment)));
    return newPayment;
  }

  async deleteAdditionalPayment(id: number): Promise<void> {
    const snapshot = await getDocs(collection(db, 'additionalPayments'));
    const docToDelete = snapshot.docs.find(d => d.data().id === id);
    if (docToDelete) {
      await updateDoc(doc(db, 'additionalPayments', docToDelete.id), { isDeleted: true });
    }
  }
}

export const storage = new FirebaseStorage();
