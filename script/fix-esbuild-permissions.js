
import fs from 'fs';
import path from 'path';
import { platform } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`[fix-permissions] Script running from: ${__dirname}`);
console.log(`[fix-permissions] Platform: ${platform()}`);

if (platform() === 'linux') {
    const rootDir = path.resolve(__dirname, '..'); // Assuming script is in /script, so ok to start from project root
    console.log(`[fix-permissions] Starting recursive search from: ${rootDir}`);

    let fixedCount = 0;

    function findAndFixEsbuild(dir) {
        if (!fs.existsSync(dir)) return;

        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    // Skip typical non-module folders to speed up, but be careful
                    if (entry.name === '.git' || entry.name === 'dist' || entry.name === '.cache') continue;

                    // Check if this directory looks like the target: @esbuild/linux-x64/bin
                    if (fullPath.endsWith('@esbuild/linux-x64/bin')) {
                        const binaryPath = path.join(fullPath, 'esbuild');
                        if (fs.existsSync(binaryPath)) {
                            try {
                                fs.chmodSync(binaryPath, 0o755);
                                console.log(`✅ [fix-permissions] Fixed: ${binaryPath}`);
                                fixedCount++;
                            } catch (err) {
                                console.error(`❌ [fix-permissions] Failed to fix ${binaryPath}:`, err.message);
                            }
                        }
                    }

                    // Optimization: Only traverse into node_modules or scope folders (@...) to avoid scanning complete project source if irrelevant
                    // But getting messy. Let's just standard recurse node_modules.
                    if (entry.name === 'node_modules' || dir.includes('node_modules')) {
                        findAndFixEsbuild(fullPath);
                    }
                }
            }
        } catch (e) {
            console.warn(`[fix-permissions] Warning reading ${dir}: ${e.message}`);
        }
    }

    // To be safe, specifically target the known structure:
    // We want to find any 'esbuild' binary inside an 'npm' package structure.
    // Actually, a simpler robust way for the user's specific case:
    // 1. Check root node_modules
    // 2. Check nested node_modules inside root node_modules (e.g. root/node_modules/vite/node_modules/...)

    // Implementation below simply walks all 'node_modules' recursively

    const rootNodeModules = path.join(rootDir, 'node_modules');
    findAndFixEsbuild(rootNodeModules);

    if (fixedCount === 0) {
        console.log('⚠️  [fix-permissions] No esbuild binaries found to fix.');
    } else {
        console.log(`[fix-permissions] Done. Fixed ${fixedCount} esbuild binaries.`);
    }

} else {
    console.log('[fix-permissions] Skipping (not on Linux).');
}
