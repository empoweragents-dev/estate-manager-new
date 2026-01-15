
import { storage } from '../server/storage';

async function deleteTenant166() {
    const tenantId = 166;
    console.log(`Starting cleanup for Tenant ID: ${tenantId} (Nowshad Jaman Opu)...`);

    // 1. Get Tenant to verify existence
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
        console.log(`Tenant ${tenantId} not found. Already deleted or invalid ID.`);
        return;
    }
    console.log(`Found Tenant: ${tenant.name} (${tenant.phone})`);

    // 2. Get Leases
    console.log('Finding leases...');
    const leases = await storage.getLeasesByTenant(tenantId);
    console.log(`Found ${leases.length} leases.`);

    for (const lease of leases) {
        console.log(`\nProcessing Lease ID: ${lease.id} (Shop ${lease.shopId})...`);

        // a. Delete Invoices
        console.log(`  - Deleting invoices...`);
        await storage.deleteRentInvoicesByLease(lease.id);

        // b. Delete Payments
        const payments = await storage.getPaymentsByLease(lease.id);
        console.log(`  - Deleting ${payments.length} payments...`);
        for (const payment of payments) {
            await storage.deletePayment(payment.id);
        }

        // c. Delete Rent Adjustments
        const adjustments = await storage.getRentAdjustmentsByLease(lease.id);
        console.log(`  - Deleting ${adjustments.length} rent adjustments...`);
        for (const adj of adjustments) {
            await storage.deleteRentAdjustment(adj.id);
        }

        // d. Delete Lease itself
        console.log(`  - Deleting Lease ${lease.id}...`);
        await storage.deleteLease(lease.id);

        // e. Update Shop status to vacant
        console.log(`  - Setting Shop ${lease.shopId} to vacant...`);
        await storage.updateShop(lease.shopId, { status: 'vacant' });
    }

    // 3. Delete Tenant
    console.log(`\nDeleting Tenant ${tenantId}...`);
    await storage.deleteTenant(tenantId);

    console.log('\n✓ Cleanup Complete!');
}

deleteTenant166().catch(err => {
    console.error('Error during cleanup:', err);
    process.exit(1);
});
