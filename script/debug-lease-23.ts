
import 'dotenv/config';
import { db } from "../server/db";
import { tenants, leases, payments, rentInvoices } from "../shared/schema";
import { eq, like } from "drizzle-orm";

async function main() {
    const LEASE_ID = 23; // Salma Sultana's lease

    console.log(`Inspecting Lease ${LEASE_ID}...\n`);

    // Get lease
    const [lease] = await db.select().from(leases).where(eq(leases.id, LEASE_ID));
    console.log(`Lease: ID=${lease.id}, Start=${lease.startDate}, End=${lease.endDate}`);

    // Get tenant
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, lease.tenantId));
    console.log(`Tenant: ${tenant.name}\n`);

    // Get payments
    const paymentList = await db.select().from(payments).where(eq(payments.leaseId, LEASE_ID));
    console.log(`Payments (${paymentList.length}):`);
    paymentList.forEach(p => {
        console.log(`  - ID: ${p.id}, Amount: ${p.amount}, Date: ${p.paymentDate}, isDeleted: ${p.isDeleted}`);
    });
    const totalPaid = paymentList.filter(p => !p.isDeleted).reduce((sum, p) => sum + parseFloat(p.amount), 0);
    console.log(`Total Active Payments: ${totalPaid}\n`);

    // Get invoices
    const invoices = await db.select().from(rentInvoices).where(eq(rentInvoices.leaseId, LEASE_ID));
    invoices.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });

    console.log(`Invoices (${invoices.length}):`);
    invoices.forEach(inv => {
        console.log(`  - ${inv.year}-${inv.month}: Amt=${inv.amount}, Paid=${inv.isPaid}, PaidAmt=${inv.paidAmount}`);
    });
}

main().catch(console.error);
