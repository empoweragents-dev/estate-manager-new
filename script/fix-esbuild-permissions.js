
import fs from 'fs';
import path from 'path';
import { platform } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`[fix-permissions] Script running from: ${__dirname}`);
console.log(`[fix-permissions] CWD: ${process.cwd()}`);

if (platform() === 'linux') {
    // Assuming script is in /script, parent is root
    const rootDir = path.resolve(__dirname, '..');
    const esbuildPath = path.join(rootDir, 'node_modules', '@esbuild', 'linux-x64', 'bin', 'esbuild');

    console.log(`[fix-permissions] Checking path: ${esbuildPath}`);

    if (fs.existsSync(esbuildPath)) {
        try {
            fs.chmodSync(esbuildPath, 0o755);
            console.log('✅ [fix-permissions] Successfully fixed esbuild permissions (chmod +x)');
        } catch (err) {
            console.error('❌ [fix-permissions] Failed to chmod:', err);
        }
    } else {
        console.log('⚠️  [fix-permissions] esbuild binary not found at expected path.');

        // Debug: Check if parent directories exist/what they contain
        try {
            const esbuildPackageDir = path.join(rootDir, 'node_modules', '@esbuild');
            if (fs.existsSync(esbuildPackageDir)) {
                console.log(`Contents of node_modules/@esbuild:`, fs.readdirSync(esbuildPackageDir));
                const linuxPackageDir = path.join(esbuildPackageDir, 'linux-x64');
                if (fs.existsSync(linuxPackageDir)) {
                    console.log(`Contents of node_modules/@esbuild/linux-x64:`, fs.readdirSync(linuxPackageDir));
                    const binDir = path.join(linuxPackageDir, 'bin');
                    if (fs.existsSync(binDir)) {
                        console.log(`Contents of node_modules/@esbuild/linux-x64/bin:`, fs.readdirSync(binDir));
                    }
                }
            }
        } catch (e) { console.log('Error debugging paths:', e); }
    }
} else {
    console.log('[fix-permissions] Skipping (not on Linux).');
}
