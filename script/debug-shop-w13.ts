
import 'dotenv/config';
import { db } from "../server/db";
import { tenants, leases, payments, shops, rentInvoices } from "../shared/schema";
import { eq, and, like } from "drizzle-orm";

async function main() {
    console.log("Debugging Shop W-13 (Md Younus)...");

    // 1. Find Shop
    const shopList = await db.select().from(shops).where(like(shops.shopNumber, '%W-13%'));
    if (shopList.length === 0) {
        console.log("Shop W-13 not found via like query.");
        return;
    }
    const shop = shopList[0];
    console.log(`Found Shop: ID ${shop.id}, Number: ${shop.shopNumber}`);

    // 2. Find Active Lease
    const leaseList = await db.select().from(leases).where(
        and(
            eq(leases.shopId, shop.id),
            eq(leases.status, 'active')
        )
    );

    if (leaseList.length === 0) {
        console.log("No active lease found for this shop.");
        return;
    }

    const lease = leaseList[0];
    console.log(`Lease Details:
    ID: ${lease.id}
    Tenant ID: ${lease.tenantId}
    Start Date: ${lease.startDate}
    End Date: ${lease.endDate}
    Monthly Rent: ${lease.monthlyRent}
  `);

    // 3. Find Tenant
    const tenant = await db.select().from(tenants).where(eq(tenants.id, lease.tenantId)).then(res => res[0]);
    console.log(`Tenant: ${tenant?.name}`);

    // 4. Find Payments
    const paymentList = await db.select().from(payments).where(eq(payments.leaseId, lease.id));
    console.log(`\nPayments (${paymentList.length}):`);
    let totalPaid = 0;
    paymentList.forEach(p => {
        console.log(`  - ID: ${p.id}, Date: ${p.paymentDate}, Amount: ${p.amount}, Notes: ${p.notes}`);
        totalPaid += parseFloat(p.amount);
    });
    console.log(`Total Paid: ${totalPaid}`);

    // 5. Find Invoices
    const invoiceList = await db.select().from(rentInvoices)
        .where(eq(rentInvoices.leaseId, lease.id));

    // Sort invoices
    invoiceList.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });

    console.log(`\nInvoices (${invoiceList.length}):`);
    invoiceList.forEach(inv => {
        console.log(`  - ${inv.year}-${inv.month}: Amount: ${inv.amount}, Paid: ${inv.isPaid} (Paid Amt: ${inv.paidAmount}), Due: ${inv.dueDate}`);
    });
}

main().catch(console.error);
