
import { storage } from '../server/storage';

async function cleanup() {
    console.log('Starting cleanup for Shop M-1 (Ariful Islam)...');

    try {
        // 1. Find the Lease
        const tenants = await storage.getTenants();
        const tenant = tenants.find(t => t.name.toLowerCase().includes('ariful islam'));

        if (!tenant) {
            console.error('Tenant "Ariful Islam" not found.');
            process.exit(1);
        }
        console.log(`Found tenant: ${tenant.name} (ID: ${tenant.id})`);

        const shops = await storage.getShops();
        const shop = shops.find(s => s.shopNumber === 'M-1' && s.floor === 'ground');

        if (!shop) {
            // Trying simpler match if M-1 not found directly with ground floor
            const shopAlt = shops.find(s => s.shopNumber === 'M-1');
            if (!shopAlt) {
                console.error('Shop "M-1" not found.');
                process.exit(1);
            }
            console.log(`Found shop: ${shopAlt.shopNumber} (ID: ${shopAlt.id})`);
        } else {
            console.log(`Found shop: ${shop.shopNumber} (ID: ${shop.id})`);
        }

        const leases = await storage.getLeasesByTenant(tenant.id);
        // Filter for the specific shop if needed, but if tenant only has one active lease it's likely this one.
        // Let's filter by matching shop ID if we found it effectively, or just list them.

        const targetShop = shop || shops.find(s => s.shopNumber === 'M-1');
        const targetLease = leases.find(l => l.shopId === targetShop?.id && l.status === 'active');

        if (!targetLease) {
            console.error('No active lease found for this tenant and shop.');
            console.log('Available leases for tenant:', leases);
            process.exit(1);
        }

        console.log(`Found Target Lease ID: ${targetLease.id} (Status: ${targetLease.status})`);

        // 2. Delete Payments
        const payments = await storage.getPaymentsByLease(targetLease.id);
        console.log(`Found ${payments.length} payments to delete.`);

        for (const p of payments) {
            await storage.deletePayment(p.id);
            console.log(`Deleted payment ID: ${p.id} (Amount: ${p.amount})`);
        }

        // 3. Delete Rent Invoices
        const invoices = await storage.getRentInvoicesByLease(targetLease.id);
        console.log(`Found ${invoices.length} invoices to delete.`);

        for (const inv of invoices) {
            await storage.deleteRentInvoice(inv.id);
            console.log(`Deleted invoice ID: ${inv.id} (Month: ${inv.month}/${inv.year}, Amount: ${inv.amount})`);
        }

        // 4. Reset lease opening balance if needed?
        // User asked to "remove all... rent collection details".
        // Does this imply resetting the lease's internal counters? 
        // The lease has `openingDueBalance`. If that was part of the "details" user wants gone, we might want to set it to 0. 
        // But strictly, deleting invoices and payments cleans up the "collection details".
        // I will leave the lease object itself intact as "active" as requested ("Lease: Shop M-1 active").

        console.log('Cleanup completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Error during cleanup:', error);
        process.exit(1);
    }
}

cleanup();
