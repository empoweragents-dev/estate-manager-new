
import { storage } from '../server/storage';

async function findPerson() {
    const searchTerm = "Nowshad Jaman Opu";
    console.log(`Searching for "${searchTerm}"...`);

    // Search Tenants
    const tenants = await storage.getTenants();
    const matchedTenants = tenants.filter(t => t.name.includes(searchTerm));
    if (matchedTenants.length > 0) {
        console.log('\nFound matching Tenants:');
        matchedTenants.forEach(t => console.log(`- ID: ${t.id}, Name: ${t.name}, Phone: ${t.phone}`));
    } else {
        console.log('\nNo matching Tenants found.');
    }

    // Search Owners
    const owners = await storage.getOwners();
    const matchedOwners = owners.filter(o => o.name.includes(searchTerm));
    if (matchedOwners.length > 0) {
        console.log('\nFound matching Owners:');
        matchedOwners.forEach(o => console.log(`- ID: ${o.id}, Name: ${o.name}, Phone: ${o.phone}`));
    } else {
        console.log('\nNo matching Owners found.');
    }

    // Search Users
    const users = await storage.getUsers();
    const matchedUsers = users.filter(u =>
        (u.firstName && u.firstName.includes(searchTerm)) ||
        (u.lastName && u.lastName.includes(searchTerm)) ||
        (u.username === searchTerm)
    );
    if (matchedUsers.length > 0) {
        console.log('\nFound matching Users:');
        matchedUsers.forEach(u => console.log(`- ID: ${u.id}, Username: ${u.username}, Name: ${u.firstName} ${u.lastName}`));
    } else {
        console.log('\nNo matching Users found.');
    }
}

findPerson().catch(console.error);
