
import 'dotenv/config'; // Load env vars
import { db } from "../server/db";
import { tenants, leases, payments, shops, rentInvoices } from "../shared/schema";
import { eq, and, like } from "drizzle-orm";

async function main() {
    console.log("Searching for tenant 'Saddam Hossain'...");

    // Find tenant
    const foundTenants = await db.select().from(tenants).where(like(tenants.name, "%Saddam Hossain%"));

    if (foundTenants.length === 0) {
        console.log("No tenant found.");
        return;
    }

    for (const tenant of foundTenants) {
        console.log(`\nFound Tenant: ${tenant.name} (ID: ${tenant.id})`);

        // Find leases for this tenant
        const foundLeases = await db.select({
            lease: leases,
            shop: shops
        })
            .from(leases)
            .leftJoin(shops, eq(leases.shopId, shops.id))
            .where(eq(leases.tenantId, tenant.id));

        for (const { lease, shop } of foundLeases) {
            if (shop?.shopNumber === 'G-L' || true) { // Filter if needed, but showing all for context
                console.log(`  Lease ID: ${lease.id}`);
                console.log(`  Shop: ${shop?.shopNumber} (${shop?.floor})`);
                console.log(`  Start Date: ${lease.startDate}`);
                console.log(`  End Date: ${lease.endDate}`);
                console.log(`  Rent: ${lease.monthlyRent}`);

                // Find payments for this lease
                const leasePayments = await db.select().from(payments).where(eq(payments.leaseId, lease.id));
                console.log(`  Payments (${leasePayments.length}):`);
                leasePayments.forEach(p => {
                    console.log(`    - ID: ${p.id}, Date: ${p.paymentDate}, Amount: ${p.amount}, Months: ${p.rentMonths}`);
                });

                // Find invoices
                const leaseInvoices = await db.select().from(rentInvoices).where(eq(rentInvoices.leaseId, lease.id));
                console.log(`  Invoices (${leaseInvoices.length}):`);
                leaseInvoices.forEach(inv => {
                    console.log(`    - ${inv.year}-${inv.month}: Paid? ${inv.isPaid}, Amount: ${inv.amount}`);
                });

            }
        }
    }
}

main().catch(console.error);
