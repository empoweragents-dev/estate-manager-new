import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Creating additional_payments table...");
    try {
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS \`additional_payments\` (
        \`id\` int AUTO_INCREMENT PRIMARY KEY,
        \`tenant_id\` int NOT NULL,
        \`owner_id\` int NOT NULL,
        \`payment_type\` enum('advance_adjustment','service_charge','other') NOT NULL,
        \`description\` text NOT NULL,
        \`amount\` decimal(12,2) NOT NULL,
        \`payment_date\` date NOT NULL,
        \`notes\` text,
        \`created_at\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`is_deleted\` tinyint(1) NOT NULL DEFAULT 0
      );
    `);
        console.log("Table created successfully (or already existed).");
    } catch (error) {
        console.error("Error creating table:", error);
    }
    process.exit(0);
}

main();
