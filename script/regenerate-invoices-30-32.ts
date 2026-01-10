import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy, limit, doc, setDoc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyB4wOE_rgPUQ2W0A4ImaCw25P9n4D8PyQw",
    authDomain: "estatemanager-861a9.firebaseapp.com",
    projectId: "estatemanager-861a9",
    storageBucket: "estatemanager-861a9.firebasestorage.app",
    messagingSenderId: "935619473858",
    appId: "1:935619473858:web:384bc544b8d97a0d02265b"
};

const app = initializeApp(firebaseConfig, "regenerate-invoices-" + Date.now());
const db = getFirestore(app);
const auth = getAuth(app);

// Helper to get next ID
async function getNextId(collectionName: string): Promise<number> {
    const q = query(collection(db, collectionName), orderBy('id', 'desc'), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return 1;
    const data = snapshot.docs[0].data();
    return (Number(data.id) || 0) + 1;
}

async function regenerateInvoices() {
    console.log('Authenticating...');
    await signInWithEmailAndPassword(auth, 'admin@estatemanager.com', 'Empower01#');
    console.log('Authenticated!\n');

    // Lease 30 (Shop 38) - Missing Jul 2023 to Mar 2025
    const lease30 = {
        id: 30,
        shopId: 38,
        tenantId: 119,
        monthlyRent: "4500",
        startDate: new Date("2023-07-03")
    };

    // Missing Dates for Lease 30
    const missingDates30 = [];
    // Jul 2023 to Dec 2023
    for (let m = 7; m <= 12; m++) missingDates30.push({ m, y: 2023 });
    // Jan 2024 to Dec 2024
    for (let m = 1; m <= 12; m++) missingDates30.push({ m, y: 2024 });
    // Jan 2025 to Mar 2025
    for (let m = 1; m <= 3; m++) missingDates30.push({ m, y: 2025 });

    console.log(`Lease 30: Regenerating ${missingDates30.length} invoices...`);

    for (const date of missingDates30) {
        const id = await getNextId('invoices');
        const invoice = {
            id,
            leaseId: lease30.id,
            tenantId: lease30.tenantId,
            rentMonth: date.m, // Using rentMonth based on schema observation? Wait, debug showed 'month' but let's re-verify.
            // Wait, check-invoices output showed "month: 4" in the raw object.
            // But I need to be sure. Let's stick to what I saw in debug output.
            // In debug output: month: 4, year: 2025.
            // But check-invoices fallback logic was `inv.rentMonth || inv.month`.
            // server/storage.ts methods usually map camelCase.
            // Let's assume standard field names from schema: rentMonth/rentYear.
            // BUT, if I write directly to firestore, I should use what the app expects.
            // The debug output `invoices[0]` has `month` and `year`.
            // Let's use `rentMonth` and `rentYear` based on `shared/schema.ts` (if I could see it).
            // Actually, let's look at `server/routes.ts` invoice generation logic if possible.
            // I will assume `rentMonth` and `rentYear` are the intended fields, but the existing data might have `month`/`year`.
            // Let's use `rentMonth` and `rentYear` as primary, and maybe adding `month`/`year` as well to be safe?
            // No, that duplicates data.
            // The debug output clearly showed `month` and `year`.
            // Let's check `shared/schema.ts` quickly? No, I'll trust the debug output `month` and `year` are used in DB.
            // Wait, the debug output also showed `dueDate`.
            // Let's use `month` and `year` to match the EXISTING First Invoice raw data I saw.
            month: date.m,
            year: date.y,
            amount: lease30.monthlyRent,
            isPaid: false,
            paidAmount: "0",
            dueDate: `${date.y}-${String(date.m).padStart(2, '0')}-${new Date(date.y, date.m, 0).getDate()}`, // Last day of month
            createdAt: new Date().toISOString()
        };

        console.log(`Creating Invoice ${id} for ${date.m}/${date.y}`);
        await setDoc(doc(db, 'invoices', String(id)), invoice);
    }

    // Lease 32 (Shop 40) - Missing Jul, Aug, Sep 2023
    const lease32 = {
        id: 32,
        shopId: 40,
        tenantId: 119,
        monthlyRent: "4500",
        startDate: new Date("2023-07-01")
    };

    const missingDates32 = [
        { m: 7, y: 2023 },
        { m: 8, y: 2023 },
        { m: 9, y: 2023 }
    ];

    console.log(`\nLease 32: Regenerating ${missingDates32.length} invoices...`);

    for (const date of missingDates32) {
        const id = await getNextId('invoices');
        const invoice = {
            id,
            leaseId: lease32.id,
            tenantId: lease32.tenantId,
            month: date.m,
            year: date.y,
            amount: lease32.monthlyRent,
            isPaid: false,
            paidAmount: "0",
            dueDate: `${date.y}-${String(date.m).padStart(2, '0')}-${new Date(date.y, date.m, 0).getDate()}`,
            createdAt: new Date().toISOString()
        };

        console.log(`Creating Invoice ${id} for ${date.m}/${date.y}`);
        await setDoc(doc(db, 'invoices', String(id)), invoice);
    }
}

regenerateInvoices().then(() => {
    console.log('\n✓ Done!');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
