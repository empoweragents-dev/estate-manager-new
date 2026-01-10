
import { storage } from '../server/storage';
import bcrypt from 'bcryptjs';

async function main() {
    console.log('Checking for super_admin user...');
    const user = await storage.getUserByUsername('super_admin');

    if (user) {
        console.log('User super_admin found.');
        if (!user.password) {
            console.log('User has no password hash. Updating...');
            const hashedPassword = await bcrypt.hash('Empower01#', 10);
            await storage.updateUser(user.id, { password: 'Empower01#' }); // updateUser handles hashing?
            // Wait, storage.updateUser says:
            // if (data.password) { updateData.password = await bcrypt.hash(data.password, 10); }
            // So I should pass the plain password to updateUser.
            console.log('Password updated to Empower01#');
        } else {
            console.log('User has a password hash.');
        }
    } else {
        console.log('User super_admin NOT found. Creating...');
        try {
            await storage.createUser({
                username: 'super_admin',
                password: 'Empower01#',
                role: 'super_admin',
                firstName: 'Super',
                lastName: 'Admin',
                email: 'admin@estatemanager.com'
            });
            console.log('Created super_admin with password Empower01#');
        } catch (e) {
            console.error('Error creating user:', e);
        }
    }
    process.exit(0);
}

main().catch(console.error);
