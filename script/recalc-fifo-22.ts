
import 'dotenv/config';
import { db } from "../server/db";
import { rentInvoices, payments } from "../shared/schema";
import { eq } from "drizzle-orm";

const LEASE_ID = 22;

async function main() {
    console.log(`Recalculating FIFO for Lease ${LEASE_ID}...`);

    // Get all invoices for this lease, sorted by year/month
    const invoices = await db.select().from(rentInvoices).where(eq(rentInvoices.leaseId, LEASE_ID));
    invoices.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });

    // Get all payments for this lease
    const paymentList = await db.select().from(payments).where(eq(payments.leaseId, LEASE_ID));
    const totalPaid = paymentList.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    console.log(`Total payments: ${totalPaid}`);
    console.log(`Invoices to process: ${invoices.length}`);

    // Apply FIFO logic
    let remainingPayment = totalPaid;

    for (const inv of invoices) {
        const invAmount = parseFloat(inv.amount);

        if (remainingPayment >= invAmount) {
            // Fully paid
            await db.update(rentInvoices).set({
                isPaid: true,
                paidAmount: invAmount.toString()
            }).where(eq(rentInvoices.id, inv.id));

            console.log(`  Invoice ${inv.year}-${inv.month}: PAID (${invAmount})`);
            remainingPayment -= invAmount;
        } else if (remainingPayment > 0) {
            // Partially paid
            await db.update(rentInvoices).set({
                isPaid: false,
                paidAmount: remainingPayment.toString()
            }).where(eq(rentInvoices.id, inv.id));

            console.log(`  Invoice ${inv.year}-${inv.month}: PARTIAL (${remainingPayment}/${invAmount})`);
            remainingPayment = 0;
        } else {
            // Not paid
            await db.update(rentInvoices).set({
                isPaid: false,
                paidAmount: '0.00'
            }).where(eq(rentInvoices.id, inv.id));

            console.log(`  Invoice ${inv.year}-${inv.month}: UNPAID`);
        }
    }

    console.log(`\nFIFO recalculation complete. Remaining credit: ${remainingPayment}`);
}

main().catch(console.error);
