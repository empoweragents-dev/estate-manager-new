
import 'dotenv/config';
import { db } from "../server/db";
import { tenants, leases, payments, rentInvoices } from "../shared/schema";
import { eq, like } from "drizzle-orm";

async function main() {
    console.log("Finding Salma Sultana's lease(s)...");

    // Find tenant
    const tenantList = await db.select().from(tenants).where(like(tenants.name, '%Salma%'));
    if (tenantList.length === 0) {
        console.log("No tenant found matching 'Salma'");
        return;
    }

    console.log(`Found ${tenantList.length} tenant(s) matching 'Salma':`);
    tenantList.forEach(t => console.log(`  - ID: ${t.id}, Name: ${t.name}`));

    for (const tenant of tenantList) {
        // Find leases for this tenant
        const tenantLeases = await db.select().from(leases).where(eq(leases.tenantId, tenant.id));
        console.log(`\nTenant ${tenant.name} has ${tenantLeases.length} lease(s):`);

        for (const lease of tenantLeases) {
            console.log(`  Lease ID: ${lease.id}, Status: ${lease.status}`);

            // Get payments for this lease
            const leasePayments = await db.select().from(payments).where(eq(payments.leaseId, lease.id));
            const totalPaid = leasePayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
            console.log(`    Payments: ${leasePayments.length}, Total: ${totalPaid}`);

            // Get invoices
            const invoices = await db.select().from(rentInvoices).where(eq(rentInvoices.leaseId, lease.id));
            invoices.sort((a, b) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.month - b.month;
            });

            console.log(`    Invoices: ${invoices.length}`);
            console.log(`    Recalculating FIFO...`);

            // Apply FIFO logic
            let remainingPayment = totalPaid;
            let fixed = 0;

            for (const inv of invoices) {
                const invAmount = parseFloat(inv.amount);
                const currentPaidAmount = parseFloat(inv.paidAmount || '0');

                let newIsPaid = false;
                let newPaidAmount = 0;

                if (remainingPayment >= invAmount) {
                    newIsPaid = true;
                    newPaidAmount = invAmount;
                    remainingPayment -= invAmount;
                } else if (remainingPayment > 0) {
                    newIsPaid = false;
                    newPaidAmount = remainingPayment;
                    remainingPayment = 0;
                } else {
                    newIsPaid = false;
                    newPaidAmount = 0;
                }

                // Update if different
                if (inv.isPaid !== newIsPaid || Math.abs(currentPaidAmount - newPaidAmount) > 0.01) {
                    await db.update(rentInvoices).set({
                        isPaid: newIsPaid,
                        paidAmount: newPaidAmount.toFixed(2)
                    }).where(eq(rentInvoices.id, inv.id));
                    fixed++;
                    console.log(`      Fixed ${inv.year}-${inv.month}: isPaid=${newIsPaid}, paidAmount=${newPaidAmount}`);
                }
            }

            console.log(`    Fixed ${fixed} invoice(s)`);
        }
    }

    console.log("\nDone!");
}

main().catch(console.error);
