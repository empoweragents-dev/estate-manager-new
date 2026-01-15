
import 'dotenv/config';
import { db } from "../server/db";
import { rentInvoices, leases, payments } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("=== Fixing ALL Invoice Due Dates ===\n");

    // Get ALL invoices
    const allInvoices = await db.select().from(rentInvoices);
    console.log(`Found ${allInvoices.length} invoices to check.\n`);

    let fixed = 0;

    for (const inv of allInvoices) {
        // Calculate correct due date: 5th of the invoice month
        const correctDueDate = new Date(inv.year, inv.month - 1, 5);
        const correctDueDateStr = correctDueDate.toISOString().split('T')[0]; // "YYYY-MM-DD"

        // Check if current due date is different
        const currentDueDate = inv.dueDate instanceof Date
            ? inv.dueDate.toISOString().split('T')[0]
            : String(inv.dueDate).split('T')[0];

        if (currentDueDate !== correctDueDateStr) {
            await db.update(rentInvoices)
                .set({ dueDate: correctDueDateStr })
                .where(eq(rentInvoices.id, inv.id));
            fixed++;
        }
    }

    console.log(`Fixed due dates for ${fixed} invoices.\n`);

    // Now recalculate FIFO for ALL active leases
    console.log("=== Recalculating FIFO for All Active Leases ===\n");

    const activeLeases = await db.select().from(leases).where(eq(leases.status, 'active'));
    console.log(`Found ${activeLeases.length} active leases.\n`);

    let totalInvoicesFixed = 0;

    for (const lease of activeLeases) {
        // Get all invoices for this lease, sorted by year/month
        const invoices = await db.select().from(rentInvoices).where(eq(rentInvoices.leaseId, lease.id));
        invoices.sort((a, b) => {
            if (a.year !== b.year) return a.year - b.year;
            return a.month - b.month;
        });

        // Get all payments for this lease
        const paymentList = await db.select().from(payments).where(eq(payments.leaseId, lease.id));
        const totalPaid = paymentList.reduce((sum, p) => sum + parseFloat(p.amount), 0);

        // Apply FIFO logic
        let remainingPayment = totalPaid;
        let leaseFixed = 0;

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
                leaseFixed++;
                totalInvoicesFixed++;
            }
        }

        if (leaseFixed > 0) {
            console.log(`Lease ${lease.id}: Fixed ${leaseFixed} invoice(s)`);
        }
    }

    console.log(`\n========================================`);
    console.log(`Total due dates fixed: ${fixed}`);
    console.log(`Total FIFO invoices fixed: ${totalInvoicesFixed}`);
    console.log(`========================================`);
}

main().catch(console.error);
