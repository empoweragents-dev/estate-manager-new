// This file serves as the reliable entry point for Hostinger deployment.
// It ensures environment variables are loaded before the app starts.

// Available in Node.js v20.12.0+ (The server is v20.19.4)
try {
    process.loadEnvFile();
    console.log('[hostinger-start] Successfully loaded .env file');
} catch (err) {
    // Ignored if .env doesn't exist (vars might be set in dashboard)
    console.log('[hostinger-start] No .env file loaded (or error reading it)');
}

// Start the application
import './dist/index.cjs';
