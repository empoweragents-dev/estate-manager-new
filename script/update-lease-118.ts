import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyB4wOE_rgPUQ2W0A4ImaCw25P9n4D8PyQw",
    authDomain: "estatemanager-861a9.firebaseapp.com",
    projectId: "estatemanager-861a9",
    storageBucket: "estatemanager-861a9.firebasestorage.app",
    messagingSenderId: "935619473858",
    appId: "1:935619473858:web:384bc544b8d97a0d02265b"
};

const app = initializeApp(firebaseConfig, "update-script-" + Date.now());
const db = getFirestore(app);
const auth = getAuth(app);

async function updateLease118() {
    console.log('Authenticating...');
    await signInWithEmailAndPassword(auth, 'admin@estatemanager.com', 'Empower01#');
    console.log('Authenticated!\n');

    // 1. Find lease 118 and update it
    console.log('=== STEP 1: Update Lease 118 ===');
    const leasesSnap = await getDocs(collection(db, 'leases'));
    const leaseDoc = leasesSnap.docs.find(d => d.data().id === 118);

    if (!leaseDoc) {
        console.log('ERROR: Lease 118 not found');
        return;
    }

    const leaseRef = doc(db, 'leases', leaseDoc.id);
    await updateDoc(leaseRef, {
        startDate: '2025-08-01',  // Change from 2025-09-01 to 2025-08-01
        monthlyRent: '10000'      // Change from 15000 to 10000
    });
    console.log('✓ Updated lease start date to 2025-08-01');
    console.log('✓ Updated monthly rent to 10000');

    // 2. Get next payment ID
    console.log('\n=== STEP 2: Add Payment for August 2025 ===');
    const paymentsSnap = await getDocs(collection(db, 'payments'));
    const existingIds = paymentsSnap.docs.map(d => d.data().id as number);
    const nextId = Math.max(...existingIds, 0) + 1;

    // 3. Add new payment for August 2025
    const lease = leaseDoc.data();
    const newPayment = {
        id: nextId,
        tenantId: lease.tenantId,  // 181
        leaseId: 118,
        amount: '10000',
        paymentDate: '2025-10-08',  // October 8, 2025
        rentMonths: ['2025-08'],    // For August 2025
        receiptNumber: '',
        notes: 'Added via data correction script',
        createdAt: new Date().toISOString(),
        isDeleted: false
    };

    await addDoc(collection(db, 'payments'), newPayment);
    console.log('✓ Added payment ID:', nextId);
    console.log('  - Amount: 10000');
    console.log('  - Date: 2025-10-08');
    console.log('  - For: August 2025');

    // 4. Verify
    console.log('\n=== VERIFICATION ===');
    const updatedLeasesSnap = await getDocs(collection(db, 'leases'));
    const updatedLease = updatedLeasesSnap.docs.find(d => d.data().id === 118)?.data();
    console.log('Lease 118 Start Date:', updatedLease?.startDate);
    console.log('Lease 118 Monthly Rent:', updatedLease?.monthlyRent);

    const updatedPaymentsSnap = await getDocs(collection(db, 'payments'));
    const lease118Payments = updatedPaymentsSnap.docs
        .map(d => d.data())
        .filter(p => p.leaseId === 118)
        .sort((a, b) => (a.rentMonths?.[0] || '').localeCompare(b.rentMonths?.[0] || ''));

    console.log('\nPayments for Lease 118:');
    lease118Payments.forEach(p => {
        console.log(`  - ID ${p.id}: ${p.paymentDate} | Amount: ${p.amount} | For: ${p.rentMonths?.join(', ')}`);
    });
}

updateLease118().then(() => {
    console.log('\n✓ All updates completed successfully!');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
