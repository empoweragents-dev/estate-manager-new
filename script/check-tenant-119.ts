import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyB4wOE_rgPUQ2W0A4ImaCw25P9n4D8PyQw",
    authDomain: "estatemanager-861a9.firebaseapp.com",
    projectId: "estatemanager-861a9",
    storageBucket: "estatemanager-861a9.firebasestorage.app",
    messagingSenderId: "935619473858",
    appId: "1:935619473858:web:384bc544b8d97a0d02265b"
};

const app = initializeApp(firebaseConfig, "check-tenant-119-" + Date.now());
const db = getFirestore(app);
const auth = getAuth(app);

async function checkTenant119() {
    console.log('Authenticating...');
    await signInWithEmailAndPassword(auth, 'admin@estatemanager.com', 'Empower01#');
    console.log('Authenticated!\n');

    // Get tenant 119
    const tenantsSnap = await getDocs(collection(db, 'tenants'));
    const tenantDoc = tenantsSnap.docs.find(d => d.data().id === 119);

    if (!tenantDoc) {
        console.log('Tenant 119 not found');
        return;
    }

    const tenant = tenantDoc.data();
    console.log('=== TENANT 119 ===');
    console.log('Name:', tenant.name);
    console.log('Phone:', tenant.phone);
    console.log('Opening Due Balance:', tenant.openingDueBalance);

    // Check additional payments for this tenant
    const addPaymentsSnap = await getDocs(collection(db, 'additionalPayments'));
    const tenantAddPayments = addPaymentsSnap.docs
        .map(d => ({ docId: d.id, ...d.data() }))
        .filter((p: any) => p.tenantId === 119 && !p.isDeleted);

    console.log('\n=== ADDITIONAL PAYMENTS ===');
    console.log('Count:', tenantAddPayments.length);
    tenantAddPayments.forEach((p: any) => {
        console.log(`  - ID ${p.id}: ${p.description} | Amount: ${p.amount} | Type: ${p.paymentType}`);
    });

    // Check if opening balance needs to be cleared
    const openingBalance = parseFloat(tenant.openingDueBalance || '0');
    if (openingBalance !== 0) {
        console.log(`\n=== CLEARING Opening Due Balance: ${openingBalance} ===`);
        const tenantRef = doc(db, 'tenants', tenantDoc.id);
        await updateDoc(tenantRef, { openingDueBalance: '0' });
        console.log('✓ Opening Due Balance set to 0');
    } else {
        console.log('\n✓ No opening due balance to clear');
    }

    // Get leases for this tenant
    const leasesSnap = await getDocs(collection(db, 'leases'));
    const tenantLeases = leasesSnap.docs
        .map(d => d.data())
        .filter((l: any) => l.tenantId === 119);

    console.log('\n=== LEASES FOR TENANT 119 ===');
    tenantLeases.forEach((l: any) => {
        console.log(`  - Lease ${l.id}: Shop ${l.shopId} | Status: ${l.status} | Rent: ${l.monthlyRent}`);
        console.log(`    Opening Due Balance: ${l.openingDueBalance || '0'}`);
        console.log(`    Security Deposit Used: ${l.securityDepositUsed || '0'}`);
    });
}

checkTenant119().then(() => {
    console.log('\n✓ Done!');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
