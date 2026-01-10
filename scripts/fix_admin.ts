
import { db } from '../client/src/lib/firebase';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import bcrypt from 'bcryptjs';

async function main() {
    console.log('Starting fix_admin.ts...');
    try {
        const q = query(collection(db, 'users'), where('username', '==', 'super_admin'));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log('User super_admin NOT found. (This is unexpected if verify found it)');
            // Create it?
        } else {
            const userDoc = snapshot.docs[0];
            console.log(`Found super_admin. ID: ${userDoc.id}`);
            const data = userDoc.data();
            if (!data.password) {
                console.log('Password missing. Setting new hash.');
                const hashedPassword = await bcrypt.hash('Empower01#', 10);
                await setDoc(doc(db, 'users', userDoc.id), { password: hashedPassword }, { merge: true });
                console.log('Password updated successfully.');
            } else {
                console.log('User already has a password.');
                // Force update anyway to be sure
                const hashedPassword = await bcrypt.hash('Empower01#', 10);
                await setDoc(doc(db, 'users', userDoc.id), { password: hashedPassword }, { merge: true });
                console.log('Password force updated.');
            }
        }
    } catch (err) {
        console.error('Error in fix_admin:', err);
    }
    console.log('Done.');
    process.exit(0);
}

main();
