
import { config } from "dotenv";
config({ path: ".env" });
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";
import { db } from "../server/db";
import {
    owners, shops, tenants, leases, rentInvoices, rentAdjustments,
    payments, bankDeposits, expenses, settings, users, deletionLogs, additionalPayments
} from "@shared/schema";
import { sql } from "drizzle-orm";

// Initialize Firebase Admin
const serviceAccountPath = path.join(process.cwd(), "service-account.json");
if (!fs.existsSync(serviceAccountPath)) {
    console.error("CRITICAL: service-account.json not found at " + serviceAccountPath);
    process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

const app = initializeApp({
    credential: cert(serviceAccount)
});
const firestore = getFirestore(app);

async function migrate() {
    console.log("Starting migration...");

    try {
        // Disable FK checks to allow migrating data with missing references (orphaned records)
        await db.execute(sql`SET FOREIGN_KEY_CHECKS=0`);

        // --- OWNERS ---
        console.log("Migrating Owners...");
        const ownersSnap = await firestore.collection('owners').get();
        for (const doc of ownersSnap.docs) {
            const data = doc.data();
            await db.insert(owners).values({
                id: Number(data.id),
                name: data.name,
                phone: data.phone || null,
                email: data.email || null,
                address: data.address || null,
                bankName: data.bankName || null,
                bankAccountNumber: data.bankAccountNumber || null,
                bankBranch: data.bankBranch || null,
            }).onDuplicateKeyUpdate({ set: { name: data.name } }); // Basic upsert to avoid duplicate errors on re-run
        }

        // --- SHOPS ---
        console.log("Migrating Shops...");
        const shopsSnap = await firestore.collection('shops').get();
        for (const doc of shopsSnap.docs) {
            const data = doc.data();
            await db.insert(shops).values({
                id: Number(data.id),
                shopNumber: data.shopNumber,
                floor: data.floor,
                subedariCategory: data.subedariCategory || null,
                squareFeet: data.squareFeet ? String(data.squareFeet) : null,
                status: data.status || 'vacant',
                ownershipType: data.ownershipType,
                ownerId: data.ownerId ? Number(data.ownerId) : null,
                description: data.description || null,
                isDeleted: data.isDeleted || false,
                deletedAt: data.deletedAt ? new Date(data.deletedAt.toDate ? data.deletedAt.toDate() : data.deletedAt) : null,
                deletionReason: data.deletionReason || null,
                deletedBy: data.deletedBy || null
            }).onDuplicateKeyUpdate({ set: { shopNumber: data.shopNumber } });
        }

        // --- TENANTS ---
        console.log("Migrating Tenants...");
        const tenantsSnap = await firestore.collection('tenants').get();
        for (const doc of tenantsSnap.docs) {
            const data = doc.data();
            await db.insert(tenants).values({
                id: Number(data.id),
                name: data.name,
                phone: data.phone,
                email: data.email || null,
                businessName: data.businessName || null,
                nidPassport: data.nidPassport || null,
                permanentAddress: data.permanentAddress || null,
                photoUrl: data.photoUrl || null,
                notes: data.notes || null,
                openingDueBalance: String(data.openingDueBalance || 0),
                createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : new Date(),
                isDeleted: data.isDeleted || false,
                deletedAt: data.deletedAt ? new Date(data.deletedAt.toDate ? data.deletedAt.toDate() : data.deletedAt) : null,
                deletionReason: data.deletionReason || null,
                deletedBy: data.deletedBy || null
            }).onDuplicateKeyUpdate({ set: { name: data.name } });
        }

        // --- LEASES ---
        console.log("Migrating Leases...");
        const leasesSnap = await firestore.collection('leases').get();
        for (const doc of leasesSnap.docs) {
            const data = doc.data();
            await db.insert(leases).values({
                id: Number(data.id),
                tenantId: Number(data.tenantId),
                shopId: Number(data.shopId),
                startDate: data.startDate, // Assuming string YYYY-MM-DD
                endDate: data.endDate,
                securityDeposit: String(data.securityDeposit),
                securityDepositUsed: String(data.securityDepositUsed || 0),
                monthlyRent: String(data.monthlyRent),
                openingDueBalance: String(data.openingDueBalance || 0),
                status: data.status,
                notes: data.notes || null,
                terminationNotes: data.terminationNotes || null,
                createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : new Date(),
            }).onDuplicateKeyUpdate({ set: { status: data.status } });
        }

        // --- RENT INVOICES ---
        console.log("Migrating Rent Invoices...");
        const invoicesSnap = await firestore.collection('invoices').get();
        for (const doc of invoicesSnap.docs) {
            const data = doc.data();
            await db.insert(rentInvoices).values({
                id: Number(data.id),
                leaseId: Number(data.leaseId),
                tenantId: Number(data.tenantId),
                amount: String(data.amount),
                dueDate: data.dueDate,
                month: Number(data.month),
                year: Number(data.year),
                isPaid: data.isPaid || false,
                paidAmount: String(data.paidAmount || 0),
                createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : new Date(),
            }).onDuplicateKeyUpdate({ set: { isPaid: data.isPaid } });
        }

        // --- RENT ADJUSTMENTS ---
        console.log("Migrating Rent Adjustments...");
        const adjSnap = await firestore.collection('rentAdjustments').get();
        for (const doc of adjSnap.docs) {
            const data = doc.data();
            await db.insert(rentAdjustments).values({
                id: Number(data.id),
                leaseId: Number(data.leaseId),
                previousRent: String(data.previousRent),
                newRent: String(data.newRent),
                adjustmentAmount: String(data.adjustmentAmount),
                effectiveDate: data.effectiveDate,
                agreementTerms: data.agreementTerms || null,
                notes: data.notes || null,
                createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : new Date(),
            }).onDuplicateKeyUpdate({ set: { notes: data.notes } });
        }

        // --- PAYMENTS ---
        console.log("Migrating Payments...");
        const paymentsSnap = await firestore.collection('payments').get();
        for (const doc of paymentsSnap.docs) {
            const data = doc.data();
            await db.insert(payments).values({
                id: Number(data.id),
                tenantId: Number(data.tenantId),
                leaseId: Number(data.leaseId),
                amount: String(data.amount),
                paymentDate: data.paymentDate,
                rentMonths: data.rentMonths, // Should be array of strings, Drizzle handles json mapping
                receiptNumber: data.receiptNumber || null,
                notes: data.notes || null,
                createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : new Date(),
                isDeleted: data.isDeleted || false,
                deletedAt: data.deletedAt ? new Date(data.deletedAt.toDate ? data.deletedAt.toDate() : data.deletedAt) : null,
                deletionReason: data.deletionReason || null,
                deletedBy: data.deletedBy || null
            } as any).onDuplicateKeyUpdate({ set: { amount: String(data.amount) } });
        }

        // --- BANK DEPOSITS ---
        console.log("Migrating Bank Deposits...");
        const depositsSnap = await firestore.collection('bankDeposits').get();
        for (const doc of depositsSnap.docs) {
            const data = doc.data();
            await db.insert(bankDeposits).values({
                id: Number(data.id),
                ownerId: Number(data.ownerId),
                amount: String(data.amount),
                depositDate: data.depositDate,
                bankName: data.bankName,
                depositSlipRef: data.depositSlipRef || null,
                notes: data.notes || null,
                createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : new Date(),
                isDeleted: data.isDeleted || false,
                deletedAt: data.deletedAt ? new Date(data.deletedAt.toDate ? data.deletedAt.toDate() : data.deletedAt) : null,
                deletionReason: data.deletionReason || null,
                deletedBy: data.deletedBy || null
            }).onDuplicateKeyUpdate({ set: { amount: String(data.amount) } });
        }

        // --- EXPENSES ---
        console.log("Migrating Expenses...");
        const expensesSnap = await firestore.collection('expenses').get();
        for (const doc of expensesSnap.docs) {
            const data = doc.data();
            await db.insert(expenses).values({
                id: Number(data.id),
                expenseType: data.expenseType,
                description: data.description,
                amount: String(data.amount),
                expenseDate: data.expenseDate,
                allocation: data.allocation,
                ownerId: data.ownerId ? Number(data.ownerId) : null,
                receiptRef: data.receiptRef || null,
                createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : new Date(),
            }).onDuplicateKeyUpdate({ set: { description: data.description } });
        }

        // --- SETTINGS ---
        console.log("Migrating Settings...");
        const settingsSnap = await firestore.collection('settings').get();
        for (const doc of settingsSnap.docs) {
            const data = doc.data();
            await db.insert(settings).values({
                id: Number(data.id),
                key: data.key,
                value: data.value,
                updatedAt: data.updatedAt ? new Date(data.updatedAt.toDate ? data.updatedAt.toDate() : data.updatedAt) : new Date(),
            }).onDuplicateKeyUpdate({ set: { value: data.value } });
        }

        // --- USERS ---
        console.log("Migrating Users...");
        const usersSnap = await firestore.collection('users').get();
        for (const doc of usersSnap.docs) {
            const data = doc.data();
            const id = doc.id; // Users used string IDs (UUIDs)
            await db.insert(users).values({
                id: id,
                username: data.username,
                password: data.password, // Already hashed
                email: data.email || null,
                firstName: data.firstName || null,
                lastName: data.lastName || null,
                phone: data.phone || null,
                role: data.role,
                ownerId: data.ownerId ? Number(data.ownerId) : null,
                createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : new Date(),
                updatedAt: data.updatedAt ? new Date(data.updatedAt.toDate ? data.updatedAt.toDate() : data.updatedAt) : new Date(),
            }).onDuplicateKeyUpdate({ set: { username: data.username } });
        }

        // --- DELETION LOGS ---
        console.log("Migrating Deletion Logs...");
        const deletionLogsSnap = await firestore.collection('deletionLogs').get();
        for (const doc of deletionLogsSnap.docs) {
            const data = doc.data();
            await db.insert(deletionLogs).values({
                id: Number(data.id),
                recordType: data.recordType,
                recordId: Number(data.recordId),
                recordDetails: data.recordDetails,
                reason: data.reason,
                deletedBy: data.deletedBy || null,
                deletedAt: data.deletedAt ? new Date(data.deletedAt.toDate ? data.deletedAt.toDate() : data.deletedAt) : new Date(),
            }).onDuplicateKeyUpdate({ set: { reason: data.reason } });
        }

        // --- ADDITIONAL PAYMENTS ---
        console.log("Migrating Additional Payments...");
        const additionalPaymentsSnap = await firestore.collection('additionalPayments').get();
        for (const doc of additionalPaymentsSnap.docs) {
            const data = doc.data();
            await db.insert(additionalPayments).values({
                id: Number(data.id),
                tenantId: Number(data.tenantId),
                ownerId: Number(data.ownerId),
                paymentType: data.paymentType,
                description: data.description,
                amount: String(data.amount),
                paymentDate: data.paymentDate,
                notes: data.notes || null,
                createdAt: data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : new Date(),
                isDeleted: data.isDeleted || false,
            }).onDuplicateKeyUpdate({ set: { notes: data.notes } });
        }

        console.log("Migration completed successfully!");
        await db.execute(sql`SET FOREIGN_KEY_CHECKS=1`);
        process.exit(0);

    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }
}

migrate();
