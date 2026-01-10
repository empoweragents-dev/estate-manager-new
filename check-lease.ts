import { db } from './server/firebase';

async function checkLease() {
    // Get all leases and find lease 118
    const leasesSnap = await db.collection('leases').get();
    const leaseDoc = leasesSnap.docs.find(d => d.data().id === 118);

    if (!leaseDoc) {
        console.log('Lease 118 not found');
        return;
    }

    const lease = leaseDoc.data();
    console.log('=== LEASE 118 ===');
    console.log('ID:', lease.id);
    console.log('Tenant ID:', lease.tenantId);
    console.log('Shop ID:', lease.shopId);
    console.log('Start Date:', lease.startDate);
    console.log('End Date:', lease.endDate);
    console.log('Monthly Rent:', lease.monthlyRent);
    console.log('Status:', lease.status);

    // Get tenant info
    const tenantsSnap = await db.collection('tenants').get();
    const tenant = tenantsSnap.docs.find(d => d.data().id === lease.tenantId)?.data();
    console.log('Tenant Name:', tenant?.name || 'Unknown');

    // Get shop info
    const shopsSnap = await db.collection('shops').get();
    const shop = shopsSnap.docs.find(d => d.data().id === lease.shopId)?.data();
    console.log('Shop Number:', shop?.shopNumber || 'Unknown');

    // Get payments for this lease
    const paymentsSnap = await db.collection('payments').get();
    const leasePayments = paymentsSnap.docs
        .map(d => d.data())
        .filter(p => p.leaseId === 118);

    console.log('\n=== PAYMENTS FOR LEASE 118 ===');
    console.log('Total payments found:', leasePayments.length);

    leasePayments.forEach(p => {
        console.log('---');
        console.log('Payment ID:', p.id);
        console.log('Date:', p.paymentDate);
        console.log('Amount:', p.amount);
        console.log('Rent Months:', p.rentMonths);
        console.log('Deleted:', p.isDeleted || false);
    });
}

checkLease().then(() => process.exit(0)).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
