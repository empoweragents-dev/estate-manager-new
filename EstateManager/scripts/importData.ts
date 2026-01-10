import { db, auth } from '../client/src/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXPORTS_DIR = path.resolve(__dirname, '../exports');

const toCamelCase = (str: string) => {
    return str.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
};

const transformKeys = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(transformKeys);
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            const camelKey = toCamelCase(key);
            acc[camelKey] = transformKeys(obj[key]);
            return acc;
        }, {} as any);
    }
    return obj;
};

const importCollection = async (collectionName: string, fileName: string) => {
    const filePath = path.join(EXPORTS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${fileName}. Skipping...`);
        return;
    }

    let fileContent = fs.readFileSync(filePath, 'utf-8');
    // Fix potential formatting issues (e.g., literal \n characters or bad separators)
    // Replaces ", \n " with ", " and remove strict newlines if they are problematic in specific context
    fileContent = fileContent.replace(/, \\n /g, ', ');

    let data;
    try {
        data = JSON.parse(fileContent);
    } catch (e) {
        console.warn(`Failed to parse directly, attempting aggressive cleanup for ${fileName}...`);
        // Try removing all newlines and backslash-n sequences
        const cleaned = fileContent.replace(/\\n/g, '').replace(/\n/g, '');
        try {
            data = JSON.parse(cleaned);
        } catch (e2) {
            console.error(`Failed to parse ${fileName}. skipping.`);
            return;
        }
    }
    const transformedData = transformKeys(data);
    let count = 0;

    console.log(`Importing ${collectionName} from ${fileName}...`);
    const batchSize = 500;

    // Note: For simplicity in this script, we are doing individual writes. 
    // For large datasets, batch writes are recommended.
    for (const item of transformedData) {
        if (!item.id) {
            console.warn('Item missing ID, skipping:', item);
            continue;
        }
        await setDoc(doc(db, collectionName, String(item.id)), item);
        count++;
    }
    console.log(`Imported ${count} documents into ${collectionName}.`);
};

const main = async () => {
    try {
        // 1. Authenticate as Super Admin (or create)
        const email = 'admin@estatemanager.com';
        const password = 'Empower01#';

        console.log('Authenticating...');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log('Signed in as existing admin.');
        } catch (e: any) {
            if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
                console.log('Creating super admin user...');
                await createUserWithEmailAndPassword(auth, email, password);
                console.log('Super admin created and signed in.');

                // Create User document for admin
                await setDoc(doc(db, 'users', auth.currentUser!.uid), {
                    username: 'super_admin',
                    email: email,
                    firstName: 'Super',
                    lastName: 'Admin',
                    role: 'super_admin',
                    createdAt: new Date().toISOString()
                });

            } else {
                throw e;
            }
        }

        // 2. Import Data
        await importCollection('owners', 'owners.json');
        await importCollection('tenants', 'tenants.json');
        await importCollection('shops', 'shops.json');
        await importCollection('leases', 'leases.json');
        await importCollection('payments', 'payments.json');
        // Add others if needed: rent_invoices.json, expenses.json, bank_deposits.json
        await importCollection('invoices', 'rent_invoices.json');
        await importCollection('expenses', 'expenses.json');
        await importCollection('bankDeposits', 'bank_deposits.json');

        console.log('Import completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Import failed:', error);
        process.exit(1);
    }
};

main();
