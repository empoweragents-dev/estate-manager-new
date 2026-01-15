
import fs from 'fs';
import path from 'path';
import { platform } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`[fix-permissions] Script running from: ${__dirname}`);
console.log(`[fix-permissions] Platform: ${platform()}`);

if (platform() === 'linux') {
    // We will check multiple locations because Hostinger build environments can be nested (e.g., .builds/...)
    // while the actual binary might be in a parent public_html/node_modules
    const potentialRoots = [
        path.resolve(__dirname, '..'),              // Standard: ./script/.. -> ./
        path.resolve(__dirname, '../../..'),        // Hostinger .builds: ./repo/scripts/../../.. -> ./public_html/.builds/.. -> public_html? 
        path.resolve(__dirname, '../../../..'),     // Deeper nesting?
        process.cwd()                               // Current working directory
    ];

    let fixed = false;

    for (const root of potentialRoots) {
        const esbuildPath = path.join(root, 'node_modules', '@esbuild', 'linux-x64', 'bin', 'esbuild');

        // De-duplicate checks roughly
        console.log(`[fix-permissions] Checking path: ${esbuildPath}`);

        if (fs.existsSync(esbuildPath)) {
            try {
                // Build system might throw if we don't own the file, but we must try.
                fs.chmodSync(esbuildPath, 0o755);
                console.log(`✅ [fix-permissions] Successfully fixed permissions at: ${esbuildPath}`);
                fixed = true;
            } catch (err) {
                console.error(`❌ [fix-permissions] Found binary but failed to chmod at ${esbuildPath}:`, err.message);
            }
        }
    }

    if (!fixed) {
        console.log('⚠️  [fix-permissions] Could not find any esbuild binary to fix.');
        console.log('    This is expected if @esbuild/linux-x64 matches no path logic or is not installed.');
        console.log('    If build fails with EACCES, please run manually: chmod +x node_modules/@esbuild/linux-x64/bin/esbuild');
    }

} else {
    console.log('[fix-permissions] Skipping (not on Linux).');
}
