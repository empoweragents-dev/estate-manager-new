import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, addDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyB4wOE_rgPUQ2W0A4ImaCw25P9n4D8PyQw",
    authDomain: "estatemanager-861a9.firebaseapp.com",
    projectId: "estatemanager-861a9",
    storageBucket: "estatemanager-861a9.firebasestorage.app",
    messagingSenderId: "935619473858",
    appId: "1:935619473858:web:384bc544b8d97a0d02265b"
};

const app = initializeApp(firebaseConfig, "add-payment-script-" + Date.now());
const db = getFirestore(app);
const auth = getAuth(app);

async function addPayment() {
    console.log('Authenticating...');
    await signInWithEmailAndPassword(auth, 'admin@estatemanager.com', 'Empower01#');
    console.log('Authenticated!\n');

    // Get lease 119 to get tenant ID
    const leasesSnap = await getDocs(collection(db, 'leases'));
    const leaseDoc = leasesSnap.docs.find(d => d.data().id === 119);

    if (!leaseDoc) {
        console.log('ERROR: Lease 119 not found');
        return;
    }

    const lease = leaseDoc.data();
    console.log('=== Lease 119 ===');
    console.log('Tenant ID:', lease.tenantId);
    console.log('Shop ID:', lease.shopId);

    // Get next payment ID
    const paymentsSnap = await getDocs(collection(db, 'payments'));
    const existingIds = paymentsSnap.docs.map(d => d.data().id as number);
    const nextId = Math.max(...existingIds, 0) + 1;

    // Add new payment for August 2025
    const newPayment = {
        id: nextId,
        tenantId: lease.tenantId,
        leaseId: 119,
        amount: '15000',
        paymentDate: '2025-10-12',  // October 12, 2025 (12/10/2025 in DD/MM/YYYY)
        rentMonths: ['2025-08'],    // For August 2025
        receiptNumber: '',
        notes: 'Added via data entry script',
        createdAt: new Date().toISOString(),
        isDeleted: false
    };

    await addDoc(collection(db, 'payments'), newPayment);
    console.log('\n✓ Added Payment');
    console.log('  - Payment ID:', nextId);
    console.log('  - Amount: 15000');
    console.log('  - Date: 2025-10-12 (Oct 12, 2025)');
    console.log('  - For: August 2025');

    // Verify
    console.log('\n=== All Payments for Lease 119 ===');
    const updatedPaymentsSnap = await getDocs(collection(db, 'payments'));
    const lease119Payments = updatedPaymentsSnap.docs
        .map(d => d.data())
        .filter(p => p.leaseId === 119)
        .sort((a, b) => (a.rentMonths?.[0] || '').localeCompare(b.rentMonths?.[0] || ''));

    lease119Payments.forEach(p => {
        console.log(`  - ID ${p.id}: ${p.paymentDate} | Amount: ${p.amount} | For: ${p.rentMonths?.join(', ')}`);
    });
}

addPayment().then(() => {
    console.log('\n✓ Payment added successfully!');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
