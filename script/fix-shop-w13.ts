
import 'dotenv/config';
import { db } from "../server/db";
import { tenants, leases, payments, shops, rentInvoices } from "../shared/schema";
import { eq, and, like } from "drizzle-orm";

async function main() {
    console.log("Fixing Shop W-13 (Md Younus)...");

    // 1. Find Shop
    const shopList = await db.select().from(shops).where(like(shops.shopNumber, '%W-13%'));
    if (shopList.length === 0) {
        console.log("Shop W-13 not found.");
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
        console.log("No active lease found.");
        return;
    }

    const lease = leaseList[0];
    console.log(`Lease ID: ${lease.id}, Start: ${lease.startDate}, End: ${lease.endDate}`);

    // 3. Delete all existing invoices for this lease
    console.log(`Deleting existing invoices for Lease ${lease.id}...`);
    await db.delete(rentInvoices).where(eq(rentInvoices.leaseId, lease.id));
    console.log("Deleted.");

    // 4. Correct the lease start date to January 1, 2025
    const correctStartDate = '2025-01-01';
    const correctEndDate = '2028-12-31';
    console.log(`Updating lease dates to ${correctStartDate} - ${correctEndDate}...`);
    await db.update(leases).set({
        startDate: correctStartDate,
        endDate: correctEndDate,
    }).where(eq(leases.id, lease.id));
    console.log("Lease dates updated.");

    // 5. Regenerate invoices from Jan 2025 to current month (Jan 2026)
    const startDate = new Date(2025, 0, 1); // January 2025
    const currentMonth = new Date(); // Current: Jan 2026

    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const invoicesToCreate: any[] = [];

    while (currentDate <= currentMonth) {
        const month = currentDate.getMonth() + 1;
        const year = currentDate.getFullYear();
        const dueDate = new Date(year, month - 1, 5); // Due on 5th of each month

        invoicesToCreate.push({
            leaseId: lease.id,
            tenantId: lease.tenantId,
            amount: lease.monthlyRent,
            dueDate: dueDate.toISOString().split('T')[0],
            month,
            year,
            isPaid: false,
            paidAmount: '0.00',
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    console.log(`Creating ${invoicesToCreate.length} invoices...`);
    if (invoicesToCreate.length > 0) {
        await db.insert(rentInvoices).values(invoicesToCreate);
    }
    console.log("Invoices created.");

    // 6. Verify payments exist
    const paymentList = await db.select().from(payments).where(eq(payments.leaseId, lease.id));
    console.log(`Payments for this lease: ${paymentList.length}`);
    paymentList.forEach(p => {
        console.log(`  - ID: ${p.id}, Amount: ${p.amount}, Date: ${p.paymentDate}, Notes: ${p.notes}`);
    });

    // 7. If no payments, check tenant-level
    if (paymentList.length === 0) {
        const tenantPayments = await db.select().from(payments).where(eq(payments.tenantId, lease.tenantId));
        console.log(`Payments for tenant (ID ${lease.tenantId}): ${tenantPayments.length}`);
        tenantPayments.forEach(p => {
            console.log(`  - ID: ${p.id}, LeaseID: ${p.leaseId}, Amount: ${p.amount}, Date: ${p.paymentDate}`);
        });
    }

    console.log("\nFix complete. Please recalculate FIFO status if needed via the UI or API.");
}

main().catch(console.error);
