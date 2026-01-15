
import fs from 'fs';
import path from 'path';
import { platform } from 'os';

console.log('Checking esbuild permissions...');

if (platform() === 'linux') {
    try {
        const esbuildPath = path.resolve('node_modules/@esbuild/linux-x64/bin/esbuild');
        if (fs.existsSync(esbuildPath)) {
            console.log(`Found esbuild at: ${esbuildPath}`);
            fs.chmodSync(esbuildPath, 0o755);
            console.log('✅ Successfully fixed esbuild permissions (chmod +x)');
        } else {
            console.log('⚠️  esbuild binary (linux-x64) not found at expected path.');
        }
    } catch (error) {
        console.error('❌ Failed to fix esbuild permissions:', error);
    }
} else {
    console.log('Skipping esbuild permission fix (not on Linux).');
}
