import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyB4wOE_rgPUQ2W0A4ImaCw25P9n4D8PyQw",
    authDomain: "estatemanager-861a9.firebaseapp.com",
    projectId: "estatemanager-861a9",
    storageBucket: "estatemanager-861a9.firebasestorage.app",
    messagingSenderId: "935619473858",
    appId: "1:935619473858:web:384bc544b8d97a0d02265b"
};

const app = initializeApp(firebaseConfig, "script-app-" + Date.now());
const db = getFirestore(app);
const auth = getAuth(app);

async function checkLease() {
    console.log('Authenticating...');
    await signInWithEmailAndPassword(auth, 'admin@estatemanager.com', 'Empower01#');
    console.log('Authenticated!\n');

    console.log('Fetching lease 118...\n');

    // Get leases
    const leasesSnap = await getDocs(collection(db, 'leases'));
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

    // Get tenant
    const tenantsSnap = await getDocs(collection(db, 'tenants'));
    const tenant = tenantsSnap.docs.find(d => d.data().id === lease.tenantId)?.data();
    console.log('Tenant Name:', tenant?.name || 'Unknown');

    // Get shop
    const shopsSnap = await getDocs(collection(db, 'shops'));
    const shop = shopsSnap.docs.find(d => d.data().id === lease.shopId)?.data();
    console.log('Shop Number:', shop?.shopNumber || 'Unknown');

    // Get payments
    const paymentsSnap = await getDocs(collection(db, 'payments'));
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
        console.log('Rent Months:', JSON.stringify(p.rentMonths));
        console.log('Deleted:', p.isDeleted || false);
    });
}

checkLease().then(() => {
    console.log('\nDone!');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
