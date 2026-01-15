
import 'dotenv/config';
import { db } from "../server/db";
import { rentInvoices, paymnet } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function main() {
    console.log("Fixing November 2025 invoice for Lease ID 17...");

    // Target: Lease 17, Year 2025, Month 11
    const leaseId = 17;
    const year = 2025;
    const month = 11;

    // Verify current status first
    const existing = await db.select()
        .from(rentInvoices)
        .where(and(
            eq(rentInvoices.leaseId, leaseId),
            eq(rentInvoices.year, year),
            eq(rentInvoices.month, month)
        ));

    if (existing.length === 0) {
        console.log("Invoice not found!");
        return;
    }

    console.log("Current Status:", existing[0]);

    // Update to isPaid = false, paidAmount = 0
    await db.update(rentInvoices)
        .set({ isPaid: false, paidAmount: "0" })
        .where(and(
            eq(rentInvoices.leaseId, leaseId),
            eq(rentInvoices.year, year),
            eq(rentInvoices.month, month)
        ));

    console.log("✅ Successfully reset invoice status to not paid.");
}

main().catch(console.error);
