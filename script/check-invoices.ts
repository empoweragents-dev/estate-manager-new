import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyB4wOE_rgPUQ2W0A4ImaCw25P9n4D8PyQw",
    authDomain: "estatemanager-861a9.firebaseapp.com",
    projectId: "estatemanager-861a9",
    storageBucket: "estatemanager-861a9.firebasestorage.app",
    messagingSenderId: "935619473858",
    appId: "1:935619473858:web:384bc544b8d97a0d02265b"
};

const app = initializeApp(firebaseConfig, "check-invoices-" + Date.now());
const db = getFirestore(app);
const auth = getAuth(app);

async function checkInvoices() {
    console.log('Authenticating...');
    await signInWithEmailAndPassword(auth, 'admin@estatemanager.com', 'Empower01#');
    console.log('Authenticated!\n');

    const targetLeases = [30, 31, 32];

    // Get Leases details first
    console.log('Fetching lease details...');
    const leasesRef = collection(db, 'leases');
    const leasesSnap = await getDocs(leasesRef);
    const leases = leasesSnap.docs
        .map(d => d.data())
        .filter((l: any) => targetLeases.includes(l.id));

    leases.forEach((l: any) => {
        console.log(`Lease ${l.id}: Start=${l.startDate}, End=${l.endDate}, Rent=${l.monthlyRent}`);
    });

    console.log('\nFetching invoices...');
    const invoicesRef = collection(db, 'invoices');
    const invoicesSnap = await getDocs(invoicesRef);

    const invoices = invoicesSnap.docs
        .map(d => d.data())
        .filter((i: any) => targetLeases.includes(i.leaseId))
        .sort((a: any, b: any) => {
            if (a.leaseId !== b.leaseId) return a.leaseId - b.leaseId;
            if (a.rentYear !== b.rentYear) return a.rentYear - b.rentYear;
            return a.rentMonth - b.rentMonth;
        });

    if (invoices.length === 0) {
        console.log('No invoices found for these leases.');
    } else {
        console.log(`Found ${invoices.length} invoices:`);

        // DEBUG: Print first invoice raw data
        console.log('DEBUG: First invoice raw data:', invoices[0]);

        invoices.forEach((inv: any) => {
            // Fallback or debug print if fields are missing
            const rMonth = inv.rentMonth || inv.month;
            const rYear = inv.rentYear || inv.year;

            if (!rMonth || !rYear) {
                console.log(`Lease ${inv.leaseId}: Missing month/year fields. Raw: ${JSON.stringify(inv)}`);
                return;
            }

            const monthName = new Date(2000, rMonth - 1, 1).toLocaleString('default', { month: 'short' });
            console.log(`Lease ${inv.leaseId}: ${monthName} ${rYear} - Amount: ${inv.amount} - Paid: ${inv.isPaid}`);
        });
    }
}

checkInvoices().then(() => {
    console.log('\n✓ Done!');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
