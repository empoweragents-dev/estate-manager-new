import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyB4wOE_rgPUQ2W0A4ImaCw25P9n4D8PyQw",
    authDomain: "estatemanager-861a9.firebaseapp.com",
    projectId: "estatemanager-861a9",
    storageBucket: "estatemanager-861a9.firebasestorage.app",
    messagingSenderId: "935619473858",
    appId: "1:935619473858:web:384bc544b8d97a0d02265b"
};

const app = initializeApp(firebaseConfig, "delete-leases-" + Date.now());
const db = getFirestore(app);
const auth = getAuth(app);

// Leases to delete (by display ID format LSE-XXXX, which means id 13, 14, 15)
const leaseIdsToDelete = [13, 14, 15];

async function deleteLeases() {
    console.log('Authenticating...');
    await signInWithEmailAndPassword(auth, 'admin@estatemanager.com', 'Empower01#');
    console.log('Authenticated!\n');

    console.log('Finding leases to delete: LSE-0013, LSE-0014, LSE-0015...\n');

    const leasesSnap = await getDocs(collection(db, 'leases'));

    for (const leaseId of leaseIdsToDelete) {
        const leaseDoc = leasesSnap.docs.find(d => d.data().id === leaseId);

        if (leaseDoc) {
            const lease = leaseDoc.data();
            console.log(`Found Lease ID ${leaseId}:`);
            console.log(`  - Firestore Doc ID: ${leaseDoc.id}`);
            console.log(`  - Shop ID: ${lease.shopId}`);
            console.log(`  - Tenant ID: ${lease.tenantId}`);
            console.log(`  - Status: ${lease.status}`);

            // Delete the lease
            await deleteDoc(doc(db, 'leases', leaseDoc.id));
            console.log(`  ✓ DELETED\n`);
        } else {
            console.log(`Lease ID ${leaseId} (LSE-${String(leaseId).padStart(4, '0')}) NOT FOUND\n`);
        }
    }

    console.log('Done!');
}

deleteLeases().then(() => {
    process.exit(0);
}).catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
