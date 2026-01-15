
import 'dotenv/config';
import { db } from "../server/db";
import { leases, rentInvoices, payments } from "../shared/schema";
import { eq } from "drizzle-orm";

async function recalcFifoForLease(leaseId: number): Promise<{ fixed: number; errors: string[] }> {
    const errors: string[] = [];
    let fixed = 0;

    try {
        // Get all invoices for this lease, sorted by year/month
        const invoices = await db.select().from(rentInvoices).where(eq(rentInvoices.leaseId, leaseId));
        invoices.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
        });

        // Get all payments for this lease
        const paymentList = await db.select().from(payments).where(eq(payments.leaseId, leaseId));
        const totalPaid = paymentList.reduce((sum, p) => sum + parseFloat(p.amount), 0);

        // Apply FIFO logic
        let remainingPayment = totalPaid;

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

            // Only update if there's a discrepancy
            if (inv.isPaid !== newIsPaid || Math.abs(currentPaidAmount - newPaidAmount) > 0.01) {
                await db.update(rentInvoices).set({
                    isPaid: newIsPaid,
                    paidAmount: newPaidAmount.toFixed(2)
                }).where(eq(rentInvoices.id, inv.id));
                fixed++;
            }
        }
    } catch (err: any) {
        errors.push(`Lease ${leaseId}: ${err.message}`);
    }

    return { fixed, errors };
}

async function main() {
    console.log("Recalculating FIFO for ALL leases...\n");

    // Get all active leases
    const allLeases = await db.select().from(leases).where(eq(leases.status, 'active'));
    console.log(`Found ${allLeases.length} active leases.\n`);

    let totalFixed = 0;
    const allErrors: string[] = [];

    for (const lease of allLeases) {
        const { fixed, errors } = await recalcFifoForLease(lease.id);
        if (fixed > 0) {
            console.log(`Lease ${lease.id}: Fixed ${fixed} invoice(s)`);
            totalFixed += fixed;
        }
        allErrors.push(...errors);
    }

    console.log(`\n========================================`);
    console.log(`Total invoices fixed: ${totalFixed}`);
    if (allErrors.length > 0) {
        console.log(`Errors encountered: ${allErrors.length}`);
        allErrors.forEach(e => console.log(`  - ${e}`));
    } else {
        console.log(`No errors encountered.`);
    }
    console.log(`========================================`);
}

main().catch(console.error);
