
// Hostinger Deployment Entry Point
// This file assumes the project has been built to ./dist/index.cjs

process.env.NODE_ENV = 'production';
console.log('Starting EstateManager in production mode...');

try {
    require('./dist/index.cjs');
} catch (error) {
    console.error('Failed to start the server:', error);
    process.exit(1);
}
