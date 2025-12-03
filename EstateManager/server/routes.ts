import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { 
  owners, shops, tenants, leases, rentInvoices, payments, bankDeposits, expenses, rentAdjustments,
  insertOwnerSchema, insertShopSchema, insertTenantSchema, insertLeaseSchema,
  insertPaymentSchema, insertBankDepositSchema, insertExpenseSchema,
  insertUserSchema, insertRentAdjustmentSchema
} from "@shared/schema";
import { eq, desc, sql, and, gte, lte } from "drizzle-orm";
import { setupAuth, isAuthenticated, requireSuperAdmin, requireOwnerOrAdmin } from "./auth";
import multer from "multer";
import * as XLSX from "xlsx";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Setup authentication
  await setupAuth(app);

  // ===== USER MANAGEMENT (Super Admin only) =====
  
  // Get all users
  app.get('/api/users', isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getUsers();
      const usersWithOwners = await Promise.all(users.map(async (user) => {
        let ownerDetails = null;
        if (user.ownerId) {
          ownerDetails = await storage.getOwner(user.ownerId);
        }
        const { password: _, ...userWithoutPassword } = user;
        return { ...userWithoutPassword, ownerDetails };
      }));
      res.json(usersWithOwners);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create new user (Owner account)
  app.post('/api/users', isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(data);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Update user
  app.patch('/api/users/:id', isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const { username, password, email, firstName, lastName, phone, role, ownerId } = req.body;
      
      // Check if username is being changed and if it already exists
      if (username) {
        const existingUser = await storage.getUserByUsername(username);
        if (existingUser && existingUser.id !== req.params.id) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }
      
      const user = await storage.updateUser(req.params.id, {
        username, password, email, firstName, lastName, phone, role, ownerId
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Delete user
  app.delete('/api/users/:id', isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      // Prevent deleting super_admin
      const user = await storage.getUser(req.params.id);
      if (user?.username === 'super_admin') {
        return res.status(400).json({ message: "Cannot delete the main Super Admin account" });
      }
      
      await storage.deleteUser(req.params.id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== OWNERS (Super Admin only for write operations) =====
  app.get("/api/owners", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allOwners = await storage.getOwners();
      
      // Get shop counts for each owner
      const ownersWithStats = await Promise.all(allOwners.map(async (owner) => {
        const ownerShops = await db.select().from(shops).where(eq(shops.ownerId, owner.id));
        
        return {
          ...owner,
          shopCount: ownerShops.length,
        };
      }));
      
      res.json(ownersWithStats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/owners/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const owner = await storage.getOwner(parseInt(req.params.id));
      if (!owner) return res.status(404).json({ message: "Owner not found" });
      res.json(owner);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/owners", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const data = insertOwnerSchema.parse(req.body);
      const owner = await storage.createOwner(data);
      res.status(201).json(owner);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/owners/:id", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      const owner = await storage.updateOwner(parseInt(req.params.id), req.body);
      if (!owner) return res.status(404).json({ message: "Owner not found" });
      res.json(owner);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/owners/:id", isAuthenticated, requireSuperAdmin, async (req: Request, res: Response) => {
    try {
      await storage.deleteOwner(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Owner Details - comprehensive view with tenants, deposits, expenses, reports
  app.get("/api/owners/:id/details", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const ownerId = parseInt(req.params.id);
      const owner = await storage.getOwner(ownerId);
      if (!owner) return res.status(404).json({ message: "Owner not found" });

      // Get all shops owned by this owner (sole ownership)
      const allShops = await storage.getShops();
      const ownerShops = allShops.filter(s => s.ownerId === ownerId);
      const shopIds = ownerShops.map(s => s.id);

      // Also include common ownership shops for revenue calculations
      const commonShops = allShops.filter(s => s.ownershipType === 'common');
      const allOwners = await storage.getOwners();
      const totalOwners = allOwners.length || 1;

      // Get all leases for owner's shops
      const allLeases = await storage.getLeases();
      const ownerLeases = allLeases.filter(l => shopIds.includes(l.shopId));

      // Get all tenants and their data
      const allTenants = await storage.getTenants();
      const allPayments = await storage.getPayments();
      const allInvoices = await storage.getRentInvoices();

      // Build tenant list with details
      const tenantList = [];
      let totalSecurityDeposit = 0;
      let totalOutstandingDues = 0;

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      for (const lease of ownerLeases) {
        if (lease.status === 'terminated') continue;

        const tenant = allTenants.find(t => t.id === lease.tenantId);
        const shop = ownerShops.find(s => s.id === lease.shopId);
        if (!tenant || !shop) continue;

        // Calculate security deposit for this lease
        const securityDeposit = parseFloat(lease.securityDeposit) - parseFloat(lease.securityDepositUsed || '0');
        totalSecurityDeposit += securityDeposit;

        // Get invoices for this lease (only elapsed months)
        const leaseInvoices = allInvoices.filter(inv => 
          inv.leaseId === lease.id &&
          (inv.year < currentYear || (inv.year === currentYear && inv.month <= currentMonth))
        );

        // Get payments for this lease
        const leasePayments = allPayments.filter(p => p.leaseId === lease.id);
        const totalPaid = leasePayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

        // Calculate total dues
        const openingDue = parseFloat(tenant.openingDueBalance || '0');
        const totalInvoiced = leaseInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
        const totalDues = openingDue + totalInvoiced - totalPaid;
        totalOutstandingDues += Math.max(0, totalDues);

        // Get last payment date
        const sortedPayments = leasePayments.sort((a, b) => 
          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
        );
        const lastPaymentDate = sortedPayments.length > 0 ? sortedPayments[0].paymentDate : null;

        // Format floor name
        const floorName = shop.floor === 'ground' ? 'Ground Floor' :
                         shop.floor === 'first' ? '1st Floor' :
                         shop.floor === 'second' ? '2nd Floor' : 
                         shop.floor === 'subedari' ? 'Subedari' : shop.floor;

        tenantList.push({
          id: tenant.id,
          leaseId: lease.id,
          name: tenant.name,
          phone: tenant.phone,
          shopNumber: shop.shopNumber,
          shopLocation: `${floorName} - ${shop.shopNumber}`,
          securityDeposit: securityDeposit,
          monthlyRent: parseFloat(lease.monthlyRent),
          currentDues: Math.max(0, totalDues),
          lastPaymentDate,
          leaseStatus: lease.status,
        });
      }

      // Get bank deposits for this owner
      const bankDeposits = await storage.getBankDepositsByOwner(ownerId);
      const depositsWithMonth = bankDeposits.map(d => {
        const date = new Date(d.depositDate);
        return {
          ...d,
          month: date.getMonth() + 1,
          year: date.getFullYear(),
          monthName: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        };
      }).sort((a, b) => new Date(b.depositDate).getTime() - new Date(a.depositDate).getTime());

      // Group deposits by month
      const depositsByMonth: Record<string, typeof depositsWithMonth> = {};
      for (const deposit of depositsWithMonth) {
        const key = deposit.monthName;
        if (!depositsByMonth[key]) depositsByMonth[key] = [];
        depositsByMonth[key].push(deposit);
      }

      // Get expenses for this owner (both owner-specific and common allocated)
      const allExpenses = await storage.getExpenses();
      const ownerExpenses = allExpenses.filter(e => 
        e.ownerId === ownerId || e.allocation === 'common'
      ).map(e => ({
        ...e,
        allocatedAmount: e.allocation === 'common' 
          ? parseFloat(e.amount) / totalOwners 
          : parseFloat(e.amount),
        isCommon: e.allocation === 'common'
      })).sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());

      // Build monthly/yearly income-expense report
      const monthlyReports: Record<string, { 
        month: string, 
        rentCollection: number, 
        bankDeposits: number, 
        expenses: number,
        netIncome: number
      }> = {};

      // Last 12 months of data
      for (let i = 0; i < 12; i++) {
        const date = new Date(currentYear, currentMonth - 1 - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const key = `${year}-${month.toString().padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        // Rent collection for owner's shops in this month
        const monthPayments = allPayments.filter(p => {
          const pDate = new Date(p.paymentDate);
          return pDate.getFullYear() === year && 
                 pDate.getMonth() + 1 === month &&
                 ownerLeases.some(l => l.id === p.leaseId);
        });
        const rentCollection = monthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

        // Bank deposits in this month
        const monthDeposits = bankDeposits.filter(d => {
          const dDate = new Date(d.depositDate);
          return dDate.getFullYear() === year && dDate.getMonth() + 1 === month;
        });
        const totalDeposits = monthDeposits.reduce((sum, d) => sum + parseFloat(d.amount), 0);

        // Expenses in this month
        const monthExpenses = allExpenses.filter(e => {
          const eDate = new Date(e.expenseDate);
          return eDate.getFullYear() === year && 
                 eDate.getMonth() + 1 === month &&
                 (e.ownerId === ownerId || e.allocation === 'common');
        });
        const totalExpenses = monthExpenses.reduce((sum, e) => 
          sum + (e.allocation === 'common' ? parseFloat(e.amount) / totalOwners : parseFloat(e.amount)), 0);

        monthlyReports[key] = {
          month: monthName,
          rentCollection,
          bankDeposits: totalDeposits,
          expenses: totalExpenses,
          netIncome: rentCollection - totalExpenses
        };
      }

      // Convert to sorted array (newest first)
      const monthlyReportArray = Object.entries(monthlyReports)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([, data]) => data);

      // Calculate yearly summary
      const yearlyReports: Record<number, {
        year: number,
        rentCollection: number,
        bankDeposits: number,
        expenses: number,
        netIncome: number
      }> = {};

      for (const [key, data] of Object.entries(monthlyReports)) {
        const year = parseInt(key.split('-')[0]);
        if (!yearlyReports[year]) {
          yearlyReports[year] = { year, rentCollection: 0, bankDeposits: 0, expenses: 0, netIncome: 0 };
        }
        yearlyReports[year].rentCollection += data.rentCollection;
        yearlyReports[year].bankDeposits += data.bankDeposits;
        yearlyReports[year].expenses += data.expenses;
        yearlyReports[year].netIncome += data.netIncome;
      }

      const yearlyReportArray = Object.values(yearlyReports).sort((a, b) => b.year - a.year);

      res.json({
        owner,
        summary: {
          totalSecurityDeposit,
          totalOutstandingDues,
          totalTenants: tenantList.length,
          totalShops: ownerShops.length,
        },
        tenants: tenantList,
        bankDeposits: depositsWithMonth,
        depositsByMonth,
        expenses: ownerExpenses,
        monthlyReports: monthlyReportArray,
        yearlyReports: yearlyReportArray,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== SHOPS =====
  app.get("/api/shops", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allShops = await storage.getShops();
      
      // Get owner details for each shop
      const shopsWithOwners = await Promise.all(allShops.map(async (shop) => {
        let owner = null;
        if (shop.ownerId) {
          owner = await storage.getOwner(shop.ownerId);
        }
        return { ...shop, owner };
      }));
      
      res.json(shopsWithOwners);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/shops/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const shop = await storage.getShop(parseInt(req.params.id));
      if (!shop) return res.status(404).json({ message: "Shop not found" });
      
      let owner = null;
      if (shop.ownerId) {
        owner = await storage.getOwner(shop.ownerId);
      }
      
      res.json({ ...shop, owner });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/shops", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const data = insertShopSchema.parse(req.body);
      const shop = await storage.createShop(data);
      res.status(201).json(shop);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/shops/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const shop = await storage.updateShop(parseInt(req.params.id), req.body);
      if (!shop) return res.status(404).json({ message: "Shop not found" });
      res.json(shop);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/shops/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteShop(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Helper function to filter invoices for elapsed months only (up to current month)
  const getElapsedInvoices = (invoices: any[]) => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    
    return invoices.filter(inv => 
      inv.year < currentYear || (inv.year === currentYear && inv.month <= currentMonth)
    );
  };

  // ===== TENANTS =====
  app.get("/api/tenants", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allTenants = await storage.getTenants();
      
      // Calculate dues for each tenant
      const tenantsWithDues = await Promise.all(allTenants.map(async (tenant) => {
        const invoices = await storage.getRentInvoicesByTenant(tenant.id);
        const tenantPayments = await storage.getPaymentsByTenant(tenant.id);
        
        // Only count invoices for elapsed months (up to current month)
        const elapsedInvoices = getElapsedInvoices(invoices);
        
        const totalInvoices = elapsedInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
        const totalPaid = tenantPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const openingBalance = parseFloat(tenant.openingDueBalance);
        
        const totalDue = openingBalance + totalInvoices;
        const currentDue = totalDue - totalPaid;
        
        // Build monthly breakdown (only for elapsed months)
        const monthlyDues: { [key: string]: number } = {};
        elapsedInvoices.forEach(inv => {
          const key = `${inv.year}-${String(inv.month).padStart(2, '0')}`;
          monthlyDues[key] = (monthlyDues[key] || 0) + parseFloat(inv.amount);
        });
        
        return {
          ...tenant,
          totalDue,
          totalPaid,
          currentDue: Math.max(0, currentDue),
          monthlyDues,
        };
      }));
      
      res.json(tenantsWithDues);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tenants/with-leases", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allTenants = await storage.getTenants();
      
      const tenantsWithLeases = await Promise.all(allTenants.map(async (tenant) => {
        const tenantLeases = await storage.getLeasesByTenant(tenant.id);
        const leasesWithShops = await Promise.all(tenantLeases.map(async (lease) => {
          const shop = await storage.getShop(lease.shopId);
          return { ...lease, shop: shop ? { shopNumber: shop.shopNumber, floor: shop.floor } : null };
        }));
        return { ...tenant, leases: leasesWithShops };
      }));
      
      res.json(tenantsWithLeases);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== TENANTS BY OWNER FILTER ===== (Must be before /api/tenants/:id to avoid route conflict)
  app.get("/api/tenants/by-owner", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const ownerIds = req.query.ownerIds as string;
      
      const allTenants = await storage.getTenants();
      const allLeases = await storage.getLeases();
      const allShops = await storage.getShops();
      const allInvoices = await storage.getRentInvoices();
      const allPayments = await storage.getPayments();
      
      let filteredTenants = allTenants;
      
      if (ownerIds && ownerIds !== 'all' && ownerIds.trim() !== '') {
        const ownerIdList = ownerIds.split(',')
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id) && id > 0);
        
        if (ownerIdList.length > 0) {
          const ownerShopIds = allShops.filter(s => s.ownerId && ownerIdList.includes(s.ownerId)).map(s => s.id);
          const tenantIdsWithOwnerLeases = allLeases
            .filter(l => ownerShopIds.includes(l.shopId))
            .map(l => l.tenantId);
          const uniqueTenantIds = [...new Set(tenantIdsWithOwnerLeases)];
          filteredTenants = allTenants.filter(t => uniqueTenantIds.includes(t.id));
        }
      }
      
      const tenantsWithDues = await Promise.all(filteredTenants.map(async (tenant) => {
        const tenantInvoices = allInvoices.filter(inv => inv.tenantId === tenant.id);
        const tenantPayments = allPayments.filter(p => p.tenantId === tenant.id);
        
        // Only count invoices for elapsed months (up to current month)
        const elapsedInvoices = getElapsedInvoices(tenantInvoices);
        
        const totalInvoices = elapsedInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
        const totalPaid = tenantPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const openingBalance = parseFloat(tenant.openingDueBalance);
        const totalDue = openingBalance + totalInvoices;
        const currentDue = Math.max(0, totalDue - totalPaid);
        
        const monthlyDues: Record<string, number> = {};
        let remainingDue = currentDue;
        
        const sortedInvoices = [...elapsedInvoices].sort((a, b) => 
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );
        
        for (const inv of sortedInvoices) {
          if (remainingDue <= 0) break;
          const invoiceAmount = parseFloat(inv.amount);
          const dueForThisMonth = Math.min(remainingDue, invoiceAmount);
          if (dueForThisMonth > 0) {
            const monthKey = `${inv.year}-${String(inv.month).padStart(2, '0')}`;
            monthlyDues[monthKey] = dueForThisMonth;
            remainingDue -= dueForThisMonth;
          }
        }
        
        return { ...tenant, totalDue, totalPaid, currentDue, monthlyDues };
      }));
      
      res.json(tenantsWithDues);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/tenants/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenant = await storage.getTenant(parseInt(req.params.id));
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      
      // Get leases with shop details
      const tenantLeases = await storage.getLeasesByTenant(tenant.id);
      const leasesWithShops = await Promise.all(tenantLeases.map(async (lease) => {
        const shop = await storage.getShop(lease.shopId);
        return { ...lease, shop: shop ? { shopNumber: shop.shopNumber, floor: shop.floor } : null };
      }));
      
      // Get payments
      const tenantPayments = await storage.getPaymentsByTenant(tenant.id);
      
      // Get invoices
      const invoices = await storage.getRentInvoicesByTenant(tenant.id);
      
      // Only count invoices for elapsed months (up to current month)
      const elapsedInvoices = getElapsedInvoices(invoices);
      
      // Calculate totals
      const totalInvoices = elapsedInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      const totalPaid = tenantPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const openingBalance = parseFloat(tenant.openingDueBalance);
      const totalDue = openingBalance + totalInvoices;
      const currentDue = Math.max(0, totalDue - totalPaid);
      
      // Build ledger entries
      const ledgerEntries: any[] = [];
      let runningBalance = 0;
      
      // Add opening balance first
      if (openingBalance > 0) {
        runningBalance = openingBalance;
        ledgerEntries.push({
          id: 0,
          date: tenant.createdAt,
          type: 'opening',
          description: 'Opening Due Balance',
          debit: openingBalance,
          credit: 0,
          balance: runningBalance,
        });
      }
      
      // Combine invoices and payments, sort by date (only elapsed invoices)
      const allEntries: { date: Date | string; type: string; amount: number; description: string }[] = [];
      
      elapsedInvoices.forEach(inv => {
        allEntries.push({
          date: inv.dueDate,
          type: 'rent',
          amount: parseFloat(inv.amount),
          description: `Rent for ${inv.month}/${inv.year}`,
        });
      });
      
      tenantPayments.forEach(p => {
        allEntries.push({
          date: p.paymentDate,
          type: 'payment',
          amount: parseFloat(p.amount),
          description: p.receiptNumber ? `Payment (${p.receiptNumber})` : 'Payment Received',
        });
      });
      
      // Sort by date
      allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Build ledger with running balance
      allEntries.forEach((entry, idx) => {
        if (entry.type === 'rent') {
          runningBalance += entry.amount;
          ledgerEntries.push({
            id: idx + 1,
            date: entry.date,
            type: 'rent',
            description: entry.description,
            debit: entry.amount,
            credit: 0,
            balance: runningBalance,
          });
        } else {
          runningBalance -= entry.amount;
          ledgerEntries.push({
            id: idx + 1,
            date: entry.date,
            type: 'payment',
            description: entry.description,
            debit: 0,
            credit: entry.amount,
            balance: runningBalance,
          });
        }
      });
      
      res.json({
        ...tenant,
        leases: leasesWithShops,
        payments: tenantPayments,
        ledgerEntries,
        totalDue,
        totalPaid,
        currentDue,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/tenants", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const data = insertTenantSchema.parse(req.body);
      
      // Check if phone number already exists
      if (data.phone) {
        const allTenants = await storage.getTenants();
        const existingTenant = allTenants.find(t => t.phone === data.phone);
        if (existingTenant) {
          return res.status(400).json({ 
            message: `Tenant with phone number ${data.phone} already exists (${existingTenant.name})` 
          });
        }
      }
      
      const tenant = await storage.createTenant(data);
      res.status(201).json(tenant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/tenants/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenant = await storage.updateTenant(parseInt(req.params.id), req.body);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      res.json(tenant);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/tenants/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteTenant(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bulk import tenants from Excel
  app.post("/api/tenants/bulk-import", isAuthenticated, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      let workbook;
      try {
        workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      } catch (parseError: any) {
        return res.status(400).json({ message: "Could not read file. Please ensure it's a valid Excel (.xlsx, .xls) or CSV file." });
      }

      if (!workbook.SheetNames.length) {
        return res.status(400).json({ message: "The file has no worksheets" });
      }

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Get all rows as arrays (header:1 means first row becomes index 0)
      const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
      
      if (!allRows.length || allRows.length < 2) {
        return res.status(400).json({ message: "Excel file is empty or has no data rows (needs header row + at least one data row)" });
      }
      
      // First row is headers, rest are data
      const headerRow = allRows[0];
      const dataRows = allRows.slice(1);
      
      // Create header-to-index mapping for data access (include all non-empty headers)
      const headerIndices: Record<string, number> = {};
      const headers: string[] = [];
      headerRow.forEach((h, idx) => {
        const headerStr = h ? String(h).trim() : '';
        if (headerStr) {
          headerIndices[headerStr] = idx;
          headers.push(headerStr);
        }
      });
      
      if (!headers.length) {
        return res.status(400).json({ message: "Excel file has no column headers" });
      }
      
      // Helper to check if header pattern matches any column in headers array
      const findHeaderIndex = (patterns: string[]): number => {
        for (const [header, idx] of Object.entries(headerIndices)) {
          const normalizedHeader = header.toLowerCase().trim().replace(/[_\-\s]+/g, '');
          for (const pattern of patterns) {
            const normalizedPattern = pattern.toLowerCase().trim().replace(/[_\-\s]+/g, '');
            if (normalizedHeader === normalizedPattern || normalizedHeader.includes(normalizedPattern)) {
              return idx;
            }
          }
        }
        return -1;
      };

      // Check if required columns exist in headers
      const nameIdx = findHeaderIndex(['name', 'tenantname', 'fullname']);
      const phoneIdx = findHeaderIndex(['phone', 'phoneno', 'phonenumber', 'mobile', 'contact']);

      if (nameIdx === -1 || phoneIdx === -1) {
        const missingCols = [];
        if (nameIdx === -1) missingCols.push('Name');
        if (phoneIdx === -1) missingCols.push('Phone');
        return res.status(400).json({ 
          message: `Missing required columns: ${missingCols.join(', ')}. Your file has columns: ${headers.join(', ')}` 
        });
      }
      
      // Find optional column indices
      const balanceIdx = findHeaderIndex(['outstandingbalance', 'balance', 'outstanding', 'openingduebalance', 'openingbalance', 'due', 'duebalance']);
      const emailIdx = findHeaderIndex(['email', 'emailaddress', 'mail']);
      const nidIdx = findHeaderIndex(['nid', 'passport', 'nidpassport', 'nationalid', 'idnumber']);
      const addressIdx = findHeaderIndex(['address', 'permanentaddress', 'location']);

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2; // Excel row number (1-indexed, plus header row)

        try {
          // Get values by column index
          const nameVal = row[nameIdx] ? String(row[nameIdx]).trim() : '';
          const phoneVal = row[phoneIdx] ? String(row[phoneIdx]).trim() : '';
          const balance = balanceIdx !== -1 && row[balanceIdx] !== undefined ? row[balanceIdx] : '0';
          const email = emailIdx !== -1 && row[emailIdx] !== undefined ? String(row[emailIdx]).trim() : '';
          const nid = nidIdx !== -1 && row[nidIdx] !== undefined ? String(row[nidIdx]).trim() : '';
          const address = addressIdx !== -1 && row[addressIdx] !== undefined ? String(row[addressIdx]).trim() : '';

          if (!nameVal || !phoneVal) {
            results.failed++;
            results.errors.push(`Row ${rowNum}: Name and Phone are required (Name: "${nameVal || 'empty'}", Phone: "${phoneVal || 'empty'}")`);
            continue;
          }

          // Parse balance as number and convert to string for decimal field
          const balanceNum = parseFloat(String(balance).replace(/[^0-9.-]/g, '')) || 0;

          await storage.createTenant({
            name: nameVal,
            phone: phoneVal,
            email: email,
            nidPassport: nid,
            permanentAddress: address,
            photoUrl: '',
            openingDueBalance: balanceNum.toFixed(2),
          });

          results.success++;
        } catch (error: any) {
          results.failed++;
          results.errors.push(`Row ${rowNum}: ${error.message}`);
        }
      }

      res.json({
        message: `Import completed: ${results.success} tenants added, ${results.failed} failed`,
        ...results,
      });
    } catch (error: any) {
      res.status(500).json({ message: `Import failed: ${error.message}` });
    }
  });

  // ===== LEASES =====
  app.get("/api/leases", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allLeases = await storage.getLeases();
      
      // Update lease statuses and get details
      const leasesWithDetails = await Promise.all(allLeases.map(async (lease) => {
        const tenant = await storage.getTenant(lease.tenantId);
        const shop = await storage.getShop(lease.shopId);
        let owner = null;
        if (shop?.ownerId) {
          owner = await storage.getOwner(shop.ownerId);
        }
        
        // Check and update status
        const today = new Date();
        const endDate = new Date(lease.endDate);
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        let newStatus = lease.status;
        if (lease.status !== 'terminated') {
          if (endDate < today) {
            newStatus = 'expired';
          } else if (endDate <= thirtyDaysFromNow) {
            newStatus = 'expiring_soon';
          } else {
            newStatus = 'active';
          }
          
          if (newStatus !== lease.status) {
            await storage.updateLease(lease.id, { status: newStatus });
          }
        }
        
        return {
          ...lease,
          status: newStatus,
          tenant,
          shop: shop ? { ...shop, owner } : null,
        };
      }));
      
      res.json(leasesWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/leases/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const lease = await storage.getLease(parseInt(req.params.id));
      if (!lease) return res.status(404).json({ message: "Lease not found" });
      
      const tenant = await storage.getTenant(lease.tenantId);
      const shop = await storage.getShop(lease.shopId);
      const owner = shop?.ownerId ? await storage.getOwner(shop.ownerId) : null;
      
      // Get rent invoices for this lease
      const allInvoices = await storage.getRentInvoices();
      const leaseInvoices = allInvoices.filter(inv => inv.leaseId === lease.id);
      
      // Only count invoices for elapsed months (up to current month)
      const elapsedLeaseInvoices = getElapsedInvoices(leaseInvoices);
      
      // Get payments for this tenant
      const tenantPayments = await storage.getPaymentsByTenant(lease.tenantId);
      const leasePayments = tenantPayments.filter(p => p.leaseId === lease.id);
      
      // Get expenses for this tenant - only filter if tenant exists
      const allExpenses = await storage.getExpenses();
      const tenantExpenses = tenant 
        ? allExpenses.filter(exp => exp.notes?.includes(`Tenant: ${tenant.name}`) || exp.notes?.includes(`tenantId:${tenant.id}`))
        : [];
      
      // Calculate outstanding per month (only elapsed invoices)
      const totalPaid = leasePayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const totalInvoiced = elapsedLeaseInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      const totalExpenses = tenantExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
      
      // Build monthly breakdown with outstanding (only for elapsed months)
      const monthlyBreakdown = elapsedLeaseInvoices.map(invoice => {
        const monthPayments = leasePayments.filter(p => {
          const paymentDate = new Date(p.paymentDate);
          return paymentDate.getMonth() + 1 === invoice.month && paymentDate.getFullYear() === invoice.year;
        });
        const paidForMonth = monthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        return {
          month: invoice.month,
          year: invoice.year,
          dueDate: invoice.dueDate,
          rentAmount: parseFloat(invoice.amount),
          paidAmount: paidForMonth,
          outstanding: Math.max(0, parseFloat(invoice.amount) - paidForMonth),
          isPaid: invoice.isPaid,
        };
      }).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
      
      res.json({
        ...lease,
        tenant,
        shop: shop ? { ...shop, owner } : null,
        invoices: elapsedLeaseInvoices,
        payments: leasePayments,
        expenses: tenantExpenses,
        monthlyBreakdown,
        summary: {
          totalInvoiced,
          totalPaid,
          totalExpenses,
          totalOutstanding: Math.max(0, totalInvoiced - totalPaid),
          grandTotalOutstanding: Math.max(0, totalInvoiced + totalExpenses - totalPaid),
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/leases", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const data = insertLeaseSchema.parse(req.body);
      const lease = await storage.createLease(data);
      
      // Update shop status to occupied
      const shop = await storage.getShop(data.shopId);
      if (shop) {
        await storage.updateShop(shop.id, { status: 'occupied' });
      }
      
      // Generate rent invoices for the lease period
      const startDate = new Date(data.startDate);
      const endDate = new Date(data.endDate);
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const dueDate = new Date(year, month - 1, 1);
        
        await storage.createRentInvoice({
          leaseId: lease.id,
          tenantId: data.tenantId,
          amount: data.monthlyRent,
          dueDate: dueDate.toISOString().split('T')[0],
          month,
          year,
          isPaid: false,
        });
        
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
      
      res.status(201).json(lease);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/leases/:id/settlement", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leaseId = parseInt(req.params.id);
      const lease = await storage.getLease(leaseId);
      if (!lease) return res.status(404).json({ message: "Lease not found" });
      
      const tenant = await storage.getTenant(lease.tenantId);
      const shop = await storage.getShop(lease.shopId);
      const invoices = await storage.getRentInvoicesByTenant(lease.tenantId);
      const tenantPayments = await storage.getPaymentsByTenant(lease.tenantId);
      
      // Only count invoices for elapsed months (up to current month)
      const elapsedInvoices = getElapsedInvoices(invoices);
      
      // Calculate all dues
      const openingBalance = parseFloat(tenant?.openingDueBalance || '0');
      const totalInvoices = elapsedInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      const totalPaid = tenantPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const totalDue = openingBalance + totalInvoices;
      const currentDue = Math.max(0, totalDue - totalPaid);
      
      // Calculate security deposit adjustment
      const securityDeposit = parseFloat(lease.securityDeposit);
      const securityDepositUsed = Math.min(currentDue, securityDeposit);
      const finalSettledAmount = currentDue - securityDepositUsed;
      const remainingSecurityDeposit = securityDeposit - securityDepositUsed;
      
      res.json({
        leaseId: lease.id,
        tenantName: tenant?.name,
        shopNumber: shop?.shopNumber,
        floor: shop?.floor,
        startDate: lease.startDate,
        endDate: lease.endDate,
        monthlyRent: lease.monthlyRent,
        openingBalance,
        totalInvoices,
        totalPaid,
        totalDue,
        currentDue,
        securityDeposit,
        securityDepositUsed,
        finalSettledAmount,
        remainingSecurityDeposit,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.put("/api/leases/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leaseId = parseInt(req.params.id);
      const lease = await storage.getLease(leaseId);
      if (!lease) return res.status(404).json({ message: "Lease not found" });
      
      if (lease.status === 'terminated') {
        return res.status(400).json({ message: "Cannot edit a terminated lease" });
      }
      
      const { startDate, endDate, monthlyRent, securityDeposit, notes } = req.body;
      
      const updateData: any = {};
      if (startDate !== undefined) updateData.startDate = startDate;
      if (endDate !== undefined) updateData.endDate = endDate;
      if (monthlyRent !== undefined) updateData.monthlyRent = monthlyRent;
      if (securityDeposit !== undefined) updateData.securityDeposit = securityDeposit;
      if (notes !== undefined) updateData.notes = notes;
      
      const updated = await storage.updateLease(leaseId, updateData);
      
      // If monthly rent changed, update all existing unpaid invoices for this lease
      if (monthlyRent !== undefined && monthlyRent !== lease.monthlyRent) {
        // Update all invoices for this lease with the new rent amount
        await db.update(rentInvoices)
          .set({ amount: monthlyRent.toString() })
          .where(eq(rentInvoices.leaseId, leaseId));
        
        // Recalculate FIFO status for the tenant
        await updateInvoicePaidStatus(lease.tenantId);
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.patch("/api/leases/:id/terminate", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leaseId = parseInt(req.params.id);
      const lease = await storage.getLease(leaseId);
      if (!lease) return res.status(404).json({ message: "Lease not found" });
      
      // Calculate tenant's current due
      const invoices = await storage.getRentInvoicesByTenant(lease.tenantId);
      const tenantPayments = await storage.getPaymentsByTenant(lease.tenantId);
      const tenant = await storage.getTenant(lease.tenantId);
      
      // Only count invoices for elapsed months (up to current month)
      const elapsedInvoices = getElapsedInvoices(invoices);
      
      const totalInvoices = elapsedInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      const totalPaid = tenantPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const openingBalance = parseFloat(tenant?.openingDueBalance || '0');
      const currentDue = Math.max(0, openingBalance + totalInvoices - totalPaid);
      
      // Deduct from security deposit if tenant has due
      const securityDepositUsed = Math.min(currentDue, parseFloat(lease.securityDeposit)).toString();
      
      // Update lease with security deposit used and terminate
      const [updated] = await db.update(leases)
        .set({ 
          status: 'terminated',
          securityDepositUsed: securityDepositUsed,
        })
        .where(eq(leases.id, leaseId))
        .returning();
      
      // Update shop status to vacant
      const shop = await storage.getShop(lease.shopId);
      if (shop) {
        await storage.updateShop(shop.id, { status: 'vacant' });
      }
      
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== RENT ADJUSTMENTS =====
  
  // Get rent adjustments for a lease
  app.get("/api/leases/:id/rent-adjustments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leaseId = parseInt(req.params.id);
      const adjustments = await db.select().from(rentAdjustments)
        .where(eq(rentAdjustments.leaseId, leaseId))
        .orderBy(desc(rentAdjustments.createdAt));
      res.json(adjustments);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create rent adjustment (increase or decrease rent)
  app.post("/api/leases/:id/rent-adjustments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const leaseId = parseInt(req.params.id);
      const lease = await storage.getLease(leaseId);
      if (!lease) return res.status(404).json({ message: "Lease not found" });
      
      if (lease.status === 'terminated') {
        return res.status(400).json({ message: "Cannot adjust rent for a terminated lease" });
      }
      
      const { newRent, effectiveDate, agreementTerms, notes } = req.body;
      
      if (!newRent || !effectiveDate) {
        return res.status(400).json({ message: "New rent amount and effective date are required" });
      }
      
      const previousRent = parseFloat(lease.monthlyRent);
      const newRentAmount = parseFloat(newRent);
      const adjustmentAmount = newRentAmount - previousRent;
      
      // Create rent adjustment record
      const [adjustment] = await db.insert(rentAdjustments).values({
        leaseId,
        previousRent: previousRent.toString(),
        newRent: newRentAmount.toString(),
        adjustmentAmount: adjustmentAmount.toString(),
        effectiveDate,
        agreementTerms: agreementTerms || null,
        notes: notes || null,
      }).returning();
      
      // Update the lease with new monthly rent
      await storage.updateLease(leaseId, { monthlyRent: newRentAmount.toString() });
      
      // Update all future invoices (from effective date onwards) with new rent
      const effectiveDateObj = new Date(effectiveDate);
      const effectiveMonth = effectiveDateObj.getMonth() + 1;
      const effectiveYear = effectiveDateObj.getFullYear();
      
      // Get all invoices for this lease and update those from effective date onwards
      const leaseInvoices = await db.select().from(rentInvoices).where(eq(rentInvoices.leaseId, leaseId));
      for (const invoice of leaseInvoices) {
        if (invoice.year > effectiveYear || (invoice.year === effectiveYear && invoice.month >= effectiveMonth)) {
          await db.update(rentInvoices)
            .set({ amount: newRentAmount.toString() })
            .where(eq(rentInvoices.id, invoice.id));
        }
      }
      
      // Recalculate FIFO status for the tenant
      await updateInvoicePaidStatus(lease.tenantId);
      
      res.status(201).json(adjustment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // ===== PAYMENTS =====
  app.get("/api/payments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allPayments = await storage.getPayments();
      
      const paymentsWithDetails = await Promise.all(allPayments.map(async (payment) => {
        const tenant = await storage.getTenant(payment.tenantId);
        const lease = await storage.getLease(payment.leaseId);
        let shop = null;
        if (lease) {
          shop = await storage.getShop(lease.shopId);
        }
        return { ...payment, tenant, lease: lease ? { ...lease, shop: shop ? { shopNumber: shop.shopNumber, floor: shop.floor } : null } : null };
      }));
      
      res.json(paymentsWithDetails);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/payments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validatedData = insertPaymentSchema.parse(req.body);
      const { tenantId, leaseId, amount, paymentDate, receiptNumber, notes } = validatedData;
      
      // Create the payment record - simple single record
      const payment = await storage.createPayment({
        tenantId,
        leaseId,
        amount: amount.toString(),
        paymentDate,
        receiptNumber: receiptNumber || '',
        notes: notes || '',
      });
      
      // Now update isPaid status on all invoices using FIFO logic
      await updateInvoicePaidStatus(tenantId);
      
      res.status(201).json(payment);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });
  
  // Helper function to update isPaid status on invoices using FIFO
  async function updateInvoicePaidStatus(tenantId: number) {
    // Get all invoices for this tenant sorted by month/year (oldest first)
    const allInvoices = await storage.getRentInvoicesByTenant(tenantId);
    const elapsedInvoices = getElapsedInvoices(allInvoices)
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
    
    // Get tenant opening balance
    const tenant = await storage.getTenant(tenantId);
    const openingBalance = parseFloat(tenant?.openingDueBalance || '0');
    
    // Get total payments for this tenant
    const allPayments = await storage.getPaymentsByTenant(tenantId);
    const totalPaid = allPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    
    // Calculate amount available for invoices (after covering opening balance)
    let remainingForInvoices = totalPaid - openingBalance;
    if (remainingForInvoices < 0) remainingForInvoices = 0;
    
    // Update isPaid status for each invoice in FIFO order
    for (const invoice of elapsedInvoices) {
      const invoiceAmount = parseFloat(invoice.amount);
      if (remainingForInvoices >= invoiceAmount) {
        // Fully paid - mark as paid
        await db.update(rentInvoices)
          .set({ isPaid: true })
          .where(eq(rentInvoices.id, invoice.id));
        remainingForInvoices -= invoiceAmount;
      } else {
        // Not fully paid - mark as unpaid
        await db.update(rentInvoices)
          .set({ isPaid: false })
          .where(eq(rentInvoices.id, invoice.id));
      }
    }
  }

  app.delete("/api/payments/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const paymentId = parseInt(req.params.id);
      // Get the payment first to find the tenantId
      const payments = await storage.getPayments();
      const paymentToDelete = payments.find(p => p.id === paymentId);
      
      await storage.deletePayment(paymentId);
      
      // Recalculate FIFO status after deleting payment
      if (paymentToDelete) {
        await updateInvoicePaidStatus(paymentToDelete.tenantId);
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== BANK DEPOSITS =====
  app.get("/api/bank-deposits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allDeposits = await storage.getBankDeposits();
      
      const depositsWithOwners = await Promise.all(allDeposits.map(async (deposit) => {
        const owner = await storage.getOwner(deposit.ownerId);
        return { ...deposit, owner };
      }));
      
      res.json(depositsWithOwners);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bank-deposits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const data = insertBankDepositSchema.parse(req.body);
      const deposit = await storage.createBankDeposit(data);
      res.status(201).json(deposit);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/bank-deposits/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteBankDeposit(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== EXPENSES =====
  app.get("/api/expenses", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allExpenses = await storage.getExpenses();
      
      const expensesWithOwners = await Promise.all(allExpenses.map(async (expense) => {
        let owner = null;
        if (expense.ownerId) {
          owner = await storage.getOwner(expense.ownerId);
        }
        return { ...expense, owner };
      }));
      
      res.json(expensesWithOwners);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/expenses", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const data = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(data);
      res.status(201).json(expense);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/expenses/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteExpense(parseInt(req.params.id));
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== INVOICE GENERATION =====
  app.post("/api/invoices/generate-monthly", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();
      
      const allLeases = await storage.getLeases();
      let generatedCount = 0;
      const failed = [];
      
      for (const lease of allLeases) {
        try {
          if (lease.status === 'terminated') continue;
          
          const startDate = new Date(lease.startDate);
          const endDate = new Date(lease.endDate);
          
          // Check if current month falls within lease period
          if (startDate.getFullYear() > currentYear || 
              (startDate.getFullYear() === currentYear && startDate.getMonth() + 1 > currentMonth)) {
            continue; // Lease hasn't started yet
          }
          
          if (endDate.getFullYear() < currentYear || 
              (endDate.getFullYear() === currentYear && endDate.getMonth() + 1 < currentMonth)) {
            continue; // Lease has ended
          }
          
          // Check if invoice already exists for this month and lease
          const existingInvoices = await storage.getRentInvoicesByTenant(lease.tenantId);
          const invoiceExists = existingInvoices.some(inv => 
            inv.month === currentMonth && inv.year === currentYear && inv.leaseId === lease.id
          );
          
          if (!invoiceExists) {
            const dueDate = new Date(currentYear, currentMonth - 1, 1);
            await storage.createRentInvoice({
              leaseId: lease.id,
              tenantId: lease.tenantId,
              amount: lease.monthlyRent,
              dueDate: dueDate.toISOString().split('T')[0],
              month: currentMonth,
              year: currentYear,
              isPaid: false,
            });
            generatedCount++;
          }
        } catch (leaseError) {
          failed.push({ leaseId: lease.id, error: String(leaseError) });
        }
      }
      
      res.json({ 
        message: `Generated ${generatedCount} invoices for ${currentMonth}/${currentYear}`,
        generated: generatedCount,
        failed: failed.length > 0 ? failed : undefined,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== SEARCH =====
  app.get("/api/search", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string || req.query[0] as string || '';
      if (query.length < 2) return res.json([]);
      
      const results = await storage.search(query);
      res.json(results);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== DASHBOARD STATS =====
  app.get("/api/dashboard/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allTenants = await storage.getTenants();
      const allShops = await storage.getShops();
      const allLeases = await storage.getLeases();
      const allPayments = await storage.getPayments();
      
      // Calculate total dues
      let totalDues = 0;
      const tenantsWithDues = await Promise.all(allTenants.map(async (tenant) => {
        const invoices = await storage.getRentInvoicesByTenant(tenant.id);
        const tenantPayments = await storage.getPaymentsByTenant(tenant.id);
        
        // Only count invoices for elapsed months (up to current month)
        const elapsedInvoices = getElapsedInvoices(invoices);
        
        const totalInvoices = elapsedInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
        const totalPaid = tenantPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const openingBalance = parseFloat(tenant.openingDueBalance);
        
        const currentDue = Math.max(0, openingBalance + totalInvoices - totalPaid);
        totalDues += currentDue;
        
        return { ...tenant, currentDue, totalDue: openingBalance + totalInvoices, totalPaid };
      }));
      
      // Calculate this month's collection
      const thisMonth = new Date();
      const firstOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
      const monthlyPayments = allPayments.filter(p => new Date(p.paymentDate) >= firstOfMonth);
      const monthlyCollection = monthlyPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      // Shop stats
      const occupiedShops = allShops.filter(s => s.status === 'occupied').length;
      const vacantShops = allShops.filter(s => s.status === 'vacant').length;
      const occupancyRate = allShops.length > 0 ? (occupiedShops / allShops.length) * 100 : 0;
      
      // Expiring leases (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const expiringLeases = await Promise.all(
        allLeases
          .filter(l => l.status === 'active' || l.status === 'expiring_soon')
          .filter(l => new Date(l.endDate) <= thirtyDaysFromNow && new Date(l.endDate) >= new Date())
          .slice(0, 5)
          .map(async (lease) => {
            const tenant = await storage.getTenant(lease.tenantId);
            const shop = await storage.getShop(lease.shopId);
            return { ...lease, tenant, shop };
          })
      );
      
      // Top debtors
      const topDebtors = tenantsWithDues
        .filter(t => t.currentDue > 0)
        .sort((a, b) => b.currentDue - a.currentDue)
        .slice(0, 5);
      
      // Recent payments
      const recentPayments = await Promise.all(
        allPayments.slice(0, 5).map(async (p) => {
          const tenant = await storage.getTenant(p.tenantId);
          return {
            id: p.id,
            tenantName: tenant?.name || 'Unknown',
            amount: p.amount,
            date: new Date(p.paymentDate).toLocaleDateString(),
          };
        })
      );
      
      // Monthly trend (last 6 months)
      const monthlyTrend = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const year = date.getFullYear();
        const monthNum = date.getMonth() + 1;
        
        const monthStart = new Date(year, monthNum - 1, 1);
        const monthEnd = new Date(year, monthNum, 0);
        
        const monthPayments = allPayments.filter(p => {
          const pDate = new Date(p.paymentDate);
          return pDate >= monthStart && pDate <= monthEnd;
        });
        
        const collected = monthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        
        // Calculate expected (sum of all monthly rents for active leases)
        const activeLeases = allLeases.filter(l => l.status === 'active' || l.status === 'expiring_soon');
        const expected = activeLeases.reduce((sum, l) => sum + parseFloat(l.monthlyRent), 0);
        
        monthlyTrend.push({
          month: `${month}`,
          collected,
          expected,
        });
      }
      
      // Floor occupancy
      const floorOccupancy = [
        { floor: 'Ground', occupied: allShops.filter(s => s.floor === 'ground' && s.status === 'occupied').length, vacant: allShops.filter(s => s.floor === 'ground' && s.status === 'vacant').length },
        { floor: '1st', occupied: allShops.filter(s => s.floor === 'first' && s.status === 'occupied').length, vacant: allShops.filter(s => s.floor === 'first' && s.status === 'vacant').length },
        { floor: '2nd', occupied: allShops.filter(s => s.floor === 'second' && s.status === 'occupied').length, vacant: allShops.filter(s => s.floor === 'second' && s.status === 'vacant').length },
      ];
      
      res.json({
        totalDues,
        monthlyCollection,
        totalShops: allShops.length,
        occupiedShops,
        vacantShops,
        occupancyRate,
        expiringLeases,
        topDebtors,
        recentPayments,
        monthlyTrend,
        floorOccupancy,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== REPORTS =====
  app.get("/api/reports/owner-statement", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const ownerId = parseInt(req.query.ownerId as string || req.query[0] as string || '0');
      const startDate = req.query.startDate as string || req.query[1] as string;
      const endDate = req.query.endDate as string || req.query[2] as string;
      
      if (!ownerId) return res.json(null);
      
      const owner = await storage.getOwner(ownerId);
      if (!owner) return res.status(404).json({ message: "Owner not found" });
      
      // Get all payments for this owner's shops in date range
      const allPayments = await storage.getPayments();
      const allLeases = await storage.getLeases();
      const allShops = await storage.getShops();
      const allOwners = await storage.getOwners();
      
      const ownerShops = allShops.filter(s => s.ownerId === ownerId);
      const commonShops = allShops.filter(s => s.ownershipType === 'common');
      
      let totalRentCollected = 0;
      let shareFromCommonShops = 0;
      
      // Calculate rent from owned shops
      for (const payment of allPayments) {
        const paymentDate = new Date(payment.paymentDate);
        if (startDate && paymentDate < new Date(startDate)) continue;
        if (endDate && paymentDate > new Date(endDate)) continue;
        
        const lease = allLeases.find(l => l.id === payment.leaseId);
        if (!lease) continue;
        
        const shop = allShops.find(s => s.id === lease.shopId);
        if (!shop) continue;
        
        if (shop.ownerId === ownerId) {
          totalRentCollected += parseFloat(payment.amount);
        } else if (shop.ownershipType === 'common') {
          // Split among all owners (20% each for 5 owners)
          shareFromCommonShops += parseFloat(payment.amount) / allOwners.length;
        }
      }
      
      // Get allocated expenses
      const allExpenses = await storage.getExpenses();
      let allocatedExpenses = 0;
      
      for (const expense of allExpenses) {
        const expenseDate = new Date(expense.expenseDate);
        if (startDate && expenseDate < new Date(startDate)) continue;
        if (endDate && expenseDate > new Date(endDate)) continue;
        
        if (expense.allocation === 'owner' && expense.ownerId === ownerId) {
          allocatedExpenses += parseFloat(expense.amount);
        } else if (expense.allocation === 'common') {
          // Split among all owners
          allocatedExpenses += parseFloat(expense.amount) / allOwners.length;
        }
      }
      
      // Get bank deposits
      const ownerDeposits = await storage.getBankDepositsByOwner(ownerId);
      const filteredDeposits = ownerDeposits.filter(d => {
        const depositDate = new Date(d.depositDate);
        if (startDate && depositDate < new Date(startDate)) return false;
        if (endDate && depositDate > new Date(endDate)) return false;
        return true;
      });
      
      const netPayout = totalRentCollected + shareFromCommonShops - allocatedExpenses;
      
      res.json({
        owner,
        totalRentCollected,
        shareFromCommonShops,
        allocatedExpenses,
        netPayout,
        bankDeposits: filteredDeposits.map(d => ({
          id: d.id,
          date: d.depositDate,
          amount: d.amount,
          bankName: d.bankName,
          ref: d.depositSlipRef,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reports/tenant-ledger", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const tenantId = parseInt(req.query.tenantId as string || req.query[0] as string || '0');
      if (!tenantId) return res.json(null);
      
      // Reuse the tenant detail endpoint logic
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) return res.status(404).json({ message: "Tenant not found" });
      
      const invoices = await storage.getRentInvoicesByTenant(tenantId);
      const tenantPayments = await storage.getPaymentsByTenant(tenantId);
      
      // Only count invoices for elapsed months (up to current month)
      const elapsedInvoices = getElapsedInvoices(invoices);
      
      const totalInvoices = elapsedInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      const totalPaid = tenantPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const openingBalance = parseFloat(tenant.openingDueBalance);
      const currentDue = Math.max(0, openingBalance + totalInvoices - totalPaid);
      
      // Build ledger entries
      const entries: any[] = [];
      let runningBalance = 0;
      
      if (openingBalance > 0) {
        runningBalance = openingBalance;
        entries.push({
          id: 0,
          date: tenant.createdAt,
          description: 'Opening Due Balance',
          debit: openingBalance,
          credit: 0,
          balance: runningBalance,
        });
      }
      
      const allEntries: { date: Date | string; type: string; amount: number; description: string }[] = [];
      
      elapsedInvoices.forEach(inv => {
        allEntries.push({
          date: inv.dueDate,
          type: 'rent',
          amount: parseFloat(inv.amount),
          description: `Rent for ${inv.month}/${inv.year}`,
        });
      });
      
      tenantPayments.forEach(p => {
        allEntries.push({
          date: p.paymentDate,
          type: 'payment',
          amount: parseFloat(p.amount),
          description: p.receiptNumber ? `Payment (${p.receiptNumber})` : 'Payment Received',
        });
      });
      
      allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      allEntries.forEach((entry, idx) => {
        if (entry.type === 'rent') {
          runningBalance += entry.amount;
          entries.push({
            id: idx + 1,
            date: entry.date,
            description: entry.description,
            debit: entry.amount,
            credit: 0,
            balance: runningBalance,
          });
        } else {
          runningBalance -= entry.amount;
          entries.push({
            id: idx + 1,
            date: entry.date,
            description: entry.description,
            debit: 0,
            credit: entry.amount,
            balance: runningBalance,
          });
        }
      });
      
      res.json({
        tenant: { ...tenant, currentDue },
        entries,
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reports/collection", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allPayments = await storage.getPayments();
      const allLeases = await storage.getLeases();
      
      const report = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const month = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const year = date.getFullYear();
        const monthNum = date.getMonth() + 1;
        
        const monthStart = new Date(year, monthNum - 1, 1);
        const monthEnd = new Date(year, monthNum, 0);
        
        // Expected = sum of all active lease monthly rents
        const activeLeases = allLeases.filter(l => {
          const startDate = new Date(l.startDate);
          const endDate = new Date(l.endDate);
          return startDate <= monthEnd && endDate >= monthStart && l.status !== 'terminated';
        });
        const expected = activeLeases.reduce((sum, l) => sum + parseFloat(l.monthlyRent), 0);
        
        // Collected = sum of payments in this month
        const monthPayments = allPayments.filter(p => {
          const pDate = new Date(p.paymentDate);
          return pDate >= monthStart && pDate <= monthEnd;
        });
        const collected = monthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        
        const pending = Math.max(0, expected - collected);
        
        report.push({ month, expected, collected, pending });
      }
      
      res.json(report);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/reports/shop-availability", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const allShops = await storage.getShops();
      const allOwners = await storage.getOwners();
      
      const floors = ['ground', 'first', 'second'];
      const availability = floors.map(floor => {
        const floorShops = allShops.filter(s => s.floor === floor);
        return {
          floor,
          shops: floorShops.map(s => {
            const owner = allOwners.find(o => o.id === s.ownerId);
            return {
              id: s.id,
              shopNumber: s.shopNumber,
              status: s.status,
              ownershipType: s.ownershipType,
              ownerName: owner?.name,
            };
          }),
        };
      });
      
      res.json(availability);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== MONTHLY DEPOSIT SUMMARY (By Year, By Owner) =====
  app.get("/api/reports/monthly-deposit-summary", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const ownerIdParam = req.query.ownerId as string;
      const yearParam = req.query.year as string;
      
      const allOwners = await storage.getOwners();
      const allPayments = await storage.getPayments();
      const allLeases = await storage.getLeases();
      const allShops = await storage.getShops();
      
      const filterYear = yearParam ? parseInt(yearParam) : null;
      const filterOwnerId = ownerIdParam && ownerIdParam !== 'all' ? parseInt(ownerIdParam) : null;
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const summaryData: {
        ownerId: number;
        ownerName: string;
        year: number;
        month: number;
        monthName: string;
        rentPayments: number;
        securityDeposits: number;
        totalDeposit: number;
      }[] = [];
      
      const ownersToProcess = filterOwnerId 
        ? allOwners.filter(o => o.id === filterOwnerId) 
        : allOwners;
      
      for (const owner of ownersToProcess) {
        const ownerShops = allShops.filter(s => s.ownerId === owner.id);
        const ownerShopIds = ownerShops.map(s => s.id);
        
        const ownerLeases = allLeases.filter(l => ownerShopIds.includes(l.shopId));
        const ownerLeaseIds = ownerLeases.map(l => l.id);
        
        const ownerPayments = allPayments.filter(p => ownerLeaseIds.includes(p.leaseId));
        
        const depositsByYearMonth: Record<string, { rent: number; security: number }> = {};
        
        for (const payment of ownerPayments) {
          const paymentDate = new Date(payment.paymentDate);
          const year = paymentDate.getFullYear();
          const month = paymentDate.getMonth() + 1;
          
          if (filterYear && year !== filterYear) continue;
          
          const key = `${year}-${month}`;
          if (!depositsByYearMonth[key]) {
            depositsByYearMonth[key] = { rent: 0, security: 0 };
          }
          depositsByYearMonth[key].rent += parseFloat(payment.amount);
        }
        
        for (const lease of ownerLeases) {
          const leaseStartDate = new Date(lease.startDate);
          const year = leaseStartDate.getFullYear();
          const month = leaseStartDate.getMonth() + 1;
          
          if (filterYear && year !== filterYear) continue;
          
          const key = `${year}-${month}`;
          if (!depositsByYearMonth[key]) {
            depositsByYearMonth[key] = { rent: 0, security: 0 };
          }
          depositsByYearMonth[key].security += parseFloat(lease.securityDeposit);
        }
        
        for (const [key, data] of Object.entries(depositsByYearMonth)) {
          const [year, month] = key.split('-').map(Number);
          summaryData.push({
            ownerId: owner.id,
            ownerName: owner.name,
            year,
            month,
            monthName: monthNames[month - 1],
            rentPayments: data.rent,
            securityDeposits: data.security,
            totalDeposit: data.rent + data.security,
          });
        }
      }
      
      summaryData.sort((a, b) => {
        if (a.ownerName !== b.ownerName) return a.ownerName.localeCompare(b.ownerName);
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      
      const availableYears = [...new Set(allPayments.map(p => new Date(p.paymentDate).getFullYear()))]
        .concat([...new Set(allLeases.map(l => new Date(l.startDate).getFullYear()))])
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort((a, b) => b - a);
      
      res.json({
        data: summaryData,
        availableYears,
        owners: allOwners.map(o => ({ id: o.id, name: o.name })),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== OWNER TRANSACTION DETAILS REPORT =====
  app.get("/api/reports/owner-transactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const ownerIdParam = req.query.ownerId as string;
      const startDateParam = req.query.startDate as string;
      const endDateParam = req.query.endDate as string;
      
      if (!ownerIdParam) {
        return res.json({ transactions: [], summary: null });
      }
      
      const ownerId = parseInt(ownerIdParam);
      const owner = await storage.getOwner(ownerId);
      if (!owner) return res.status(404).json({ message: "Owner not found" });
      
      const allPayments = await storage.getPayments();
      const allLeases = await storage.getLeases();
      const allShops = await storage.getShops();
      const allExpenses = await storage.getExpenses();
      const allOwners = await storage.getOwners();
      const allTenants = await storage.getTenants();
      
      const ownerShops = allShops.filter(s => s.ownerId === ownerId);
      const ownerShopIds = ownerShops.map(s => s.id);
      const commonShops = allShops.filter(s => s.ownershipType === 'common');
      
      const ownerLeases = allLeases.filter(l => ownerShopIds.includes(l.shopId));
      const ownerLeaseIds = ownerLeases.map(l => l.id);
      const commonLeases = allLeases.filter(l => commonShops.map(s => s.id).includes(l.shopId));
      
      const transactions: {
        id: number;
        date: string;
        description: string;
        type: 'credit' | 'debit';
        category: string;
        amount: number;
        balance: number;
        shopNumber?: string;
        tenantName?: string;
      }[] = [];
      
      for (const payment of allPayments) {
        const paymentDate = new Date(payment.paymentDate);
        if (startDateParam && paymentDate < new Date(startDateParam)) continue;
        if (endDateParam && paymentDate > new Date(endDateParam)) continue;
        
        const lease = allLeases.find(l => l.id === payment.leaseId);
        if (!lease) continue;
        
        const shop = allShops.find(s => s.id === lease.shopId);
        const tenant = allTenants.find(t => t.id === payment.tenantId);
        
        if (ownerLeaseIds.includes(payment.leaseId)) {
          transactions.push({
            id: payment.id,
            date: payment.paymentDate,
            description: `Rent Payment - ${shop?.shopNumber || 'Unknown Shop'}`,
            type: 'credit',
            category: 'Rent Payment',
            amount: parseFloat(payment.amount),
            balance: 0,
            shopNumber: shop?.shopNumber,
            tenantName: tenant?.name,
          });
        } else if (commonLeases.map(l => l.id).includes(payment.leaseId)) {
          const shareAmount = parseFloat(payment.amount) / allOwners.length;
          transactions.push({
            id: payment.id + 100000,
            date: payment.paymentDate,
            description: `Share from Common Shop ${shop?.shopNumber || ''} (1/${allOwners.length})`,
            type: 'credit',
            category: 'Common Shop Share',
            amount: shareAmount,
            balance: 0,
            shopNumber: shop?.shopNumber,
            tenantName: tenant?.name,
          });
        }
      }
      
      for (const lease of ownerLeases) {
        const leaseStartDate = new Date(lease.startDate);
        if (startDateParam && leaseStartDate < new Date(startDateParam)) continue;
        if (endDateParam && leaseStartDate > new Date(endDateParam)) continue;
        
        const shop = allShops.find(s => s.id === lease.shopId);
        const tenant = allTenants.find(t => t.id === lease.tenantId);
        
        if (parseFloat(lease.securityDeposit) > 0) {
          transactions.push({
            id: lease.id + 200000,
            date: lease.startDate,
            description: `Security Deposit - ${shop?.shopNumber || 'Unknown Shop'}`,
            type: 'credit',
            category: 'Security Deposit',
            amount: parseFloat(lease.securityDeposit),
            balance: 0,
            shopNumber: shop?.shopNumber,
            tenantName: tenant?.name,
          });
        }
      }
      
      for (const expense of allExpenses) {
        const expenseDate = new Date(expense.expenseDate);
        if (startDateParam && expenseDate < new Date(startDateParam)) continue;
        if (endDateParam && expenseDate > new Date(endDateParam)) continue;
        
        if (expense.allocation === 'owner' && expense.ownerId === ownerId) {
          transactions.push({
            id: expense.id + 300000,
            date: expense.expenseDate,
            description: `${expense.description} (Owner Expense)`,
            type: 'debit',
            category: expense.expenseType,
            amount: parseFloat(expense.amount),
            balance: 0,
          });
        } else if (expense.allocation === 'common') {
          const shareAmount = parseFloat(expense.amount) / allOwners.length;
          transactions.push({
            id: expense.id + 400000,
            date: expense.expenseDate,
            description: `${expense.description} (Common 1/${allOwners.length})`,
            type: 'debit',
            category: expense.expenseType,
            amount: shareAmount,
            balance: 0,
          });
        }
      }
      
      transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      let runningBalance = 0;
      for (const tx of transactions) {
        if (tx.type === 'credit') {
          runningBalance += tx.amount;
        } else {
          runningBalance -= tx.amount;
        }
        tx.balance = runningBalance;
      }
      
      const totalCredits = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
      const totalDebits = transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
      const rentPayments = transactions.filter(t => t.category === 'Rent Payment').reduce((sum, t) => sum + t.amount, 0);
      const securityDeposits = transactions.filter(t => t.category === 'Security Deposit').reduce((sum, t) => sum + t.amount, 0);
      const commonShopShare = transactions.filter(t => t.category === 'Common Shop Share').reduce((sum, t) => sum + t.amount, 0);
      
      res.json({
        owner,
        transactions,
        summary: {
          totalCredits,
          totalDebits,
          netBalance: runningBalance,
          rentPayments,
          securityDeposits,
          commonShopShare,
          totalExpenses: totalDebits,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // ===== OWNER-TENANT DETAILS REPORT =====
  app.get("/api/reports/owner-tenant-details", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { ownerId, tenantId, shopId, month, year, page = '1', limit = '20' } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const currentDate = new Date();
      const reportMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;
      const reportYear = year ? parseInt(year as string) : currentDate.getFullYear();
      
      // Get all data needed
      const allOwners = await storage.getOwners();
      const allShops = await storage.getShops();
      const allTenants = await storage.getTenants();
      const allLeases = await storage.getLeases();
      const allPayments = await storage.getPayments();
      const allInvoices = await storage.getRentInvoices();
      
      // Filter shops by owner if specified
      let filteredShops = allShops;
      if (ownerId && ownerId !== 'all') {
        filteredShops = allShops.filter(s => s.ownerId === parseInt(ownerId as string));
      }
      
      // Filter by specific shop if specified
      if (shopId && shopId !== 'all') {
        filteredShops = filteredShops.filter(s => s.id === parseInt(shopId as string));
      }
      
      // Get active leases for filtered shops
      let activeLeases = allLeases.filter(l => 
        (l.status === 'active' || l.status === 'expiring_soon') &&
        filteredShops.some(s => s.id === l.shopId)
      );
      
      // Filter by tenant if specified
      if (tenantId && tenantId !== 'all') {
        activeLeases = activeLeases.filter(l => l.tenantId === parseInt(tenantId as string));
      }
      
      // Build report data
      const reportData = [];
      
      for (const lease of activeLeases) {
        const tenant = allTenants.find(t => t.id === lease.tenantId);
        const shop = allShops.find(s => s.id === lease.shopId);
        const owner = shop?.ownerId ? allOwners.find(o => o.id === shop.ownerId) : null;
        
        if (!tenant || !shop) continue;
        
        // Get invoices for this lease - only elapsed months up to today
        const leaseInvoices = allInvoices.filter(inv => inv.leaseId === lease.id);
        const elapsedLeaseInvoices = getElapsedInvoices(leaseInvoices);
        
        // Get payments for this tenant's lease
        const leasePayments = allPayments.filter(p => p.leaseId === lease.id);
        
        // Calculate current month's due (only if the report month has elapsed)
        const currentMonthInvoice = elapsedLeaseInvoices.find(inv => 
          inv.month === reportMonth && inv.year === reportYear
        );
        const currentMonthDue = currentMonthInvoice ? parseFloat(currentMonthInvoice.amount) : 0;
        
        // Calculate current month's payments
        const currentMonthPayments = leasePayments.filter(p => {
          const pDate = new Date(p.paymentDate);
          return pDate.getMonth() + 1 === reportMonth && pDate.getFullYear() === reportYear;
        });
        const currentMonthPaid = currentMonthPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        const currentRentDue = Math.max(0, currentMonthDue - currentMonthPaid);
        
        // Calculate previous rent due (only elapsed months before report month)
        const previousInvoices = elapsedLeaseInvoices.filter(inv => 
          inv.year < reportYear || (inv.year === reportYear && inv.month < reportMonth)
        );
        const previousInvoiceTotal = previousInvoices.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
        
        // Get all payments before current month
        const previousPayments = leasePayments.filter(p => {
          const pDate = new Date(p.paymentDate);
          return pDate.getFullYear() < reportYear || 
                 (pDate.getFullYear() === reportYear && pDate.getMonth() + 1 < reportMonth);
        });
        const previousPaid = previousPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
        
        // Add opening balance to previous due
        const openingBalance = parseFloat(tenant.openingDueBalance || '0');
        const previousRentDue = Math.max(0, openingBalance + previousInvoiceTotal - previousPaid);
        
        // Get most recent payment
        const sortedPayments = [...leasePayments].sort((a, b) => 
          new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
        );
        const recentPayment = sortedPayments[0];
        
        reportData.push({
          leaseId: lease.id,
          ownerId: owner?.id,
          ownerName: owner?.name || 'Common',
          shopId: shop.id,
          shopLocation: `${shop.shopNumber} - ${shop.floor === 'ground' ? 'Ground' : shop.floor === 'first' ? '1st' : '2nd'} Floor`,
          tenantId: tenant.id,
          tenantName: tenant.name,
          phone: tenant.phone,
          monthlyRent: parseFloat(lease.monthlyRent),
          recentPaymentAmount: recentPayment ? parseFloat(recentPayment.amount) : 0,
          recentPaymentDate: recentPayment?.paymentDate || null,
          currentRentDue,
          previousRentDue,
        });
      }
      
      // Sort by owner name, then shop number
      reportData.sort((a, b) => {
        if (a.ownerName !== b.ownerName) {
          return a.ownerName.localeCompare(b.ownerName);
        }
        return a.shopLocation.localeCompare(b.shopLocation);
      });
      
      // Calculate totals
      const totals = {
        totalCurrentRentDue: reportData.reduce((sum, r) => sum + r.currentRentDue, 0),
        totalPreviousRentDue: reportData.reduce((sum, r) => sum + r.previousRentDue, 0),
        totalMonthlyRent: reportData.reduce((sum, r) => sum + r.monthlyRent, 0),
        totalRecentPayments: reportData.reduce((sum, r) => sum + r.recentPaymentAmount, 0),
      };
      
      // Calculate total received for selected period
      let periodPayments = allPayments;
      if (ownerId && ownerId !== 'all') {
        const ownerShopIds = filteredShops.map(s => s.id);
        const ownerLeaseIds = allLeases.filter(l => ownerShopIds.includes(l.shopId)).map(l => l.id);
        periodPayments = allPayments.filter(p => ownerLeaseIds.includes(p.leaseId));
      }
      
      const periodReceivedPayments = periodPayments.filter(p => {
        const pDate = new Date(p.paymentDate);
        return pDate.getMonth() + 1 === reportMonth && pDate.getFullYear() === reportYear;
      });
      totals.totalRecentPayments = periodReceivedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      
      // Paginate results
      const totalRecords = reportData.length;
      const totalPages = Math.ceil(totalRecords / limitNum);
      const startIndex = (pageNum - 1) * limitNum;
      const paginatedData = reportData.slice(startIndex, startIndex + limitNum);
      
      // Get owner info for header
      const selectedOwner = ownerId && ownerId !== 'all' 
        ? allOwners.find(o => o.id === parseInt(ownerId as string))
        : null;
      
      res.json({
        data: paginatedData,
        allData: reportData, // For PDF export
        totals,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalRecords,
          totalPages,
        },
        filters: {
          ownerId: ownerId || 'all',
          ownerName: selectedOwner?.name || 'All Owners',
          tenantId: tenantId || 'all',
          shopId: shopId || 'all',
          month: reportMonth,
          year: reportYear,
        },
        reportDate: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  return httpServer;
}
