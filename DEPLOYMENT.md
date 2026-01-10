# Deploying to Hostinger

This guide explains how to deploy the **EstateManager** application to Hostinger Node.js hosting.

## Prerequisites
1.  **Hostinger Plan**: Ensure you have a plan that supports Node.js (e.g., Cloud or VPS, or Shared with Node.js selector).
2.  **Node.js Version**: Select **Node.js 18** or **20** in your Hostinger dashboard.

## Step 1: Prepare the Files
You need to upload the following files/folders to your `public_html` (or subdomain folder) on Hostinger.
**First, run `npm run build` locally to generate the `dist` folder.**

Files to upload:
1.  `dist/` (The entire folder containing `index.cjs` and `public/`)
2.  `server.js` (The entry point file created in the root)
3.  `package.json` (For dependency installation)
4.  `package-lock.json` (Optional but recommended)

> **Tip**: You can zip these files locally (zip the contents, not the parent folder) and verify the structure before uploading. The zip root should contain `server.js` and the `dist` folder.

## Step 2: Upload to Hostinger
1.  Go to **File Manager** in your Hostinger dashboard.
2.  Navigate to your web root (usually `public_html`).
3.  Upload your zip file and extract it (or upload files individually).
4.  Ensure `server.js` is in the main directory.

## Step 3: Configure Node.js Application
1.  Go to the **Node.js** section in your Hostinger dashboard.
2.  **Application Root**: Set to your folder path (usually just `public_html` if it's the main domain).
3.  **Application Startup File**: Enter `server.js`.
4.  **Run NPM Install**: Click the "NPM Install" button.
    *   *Note: This installs dependencies defined in package.json.*

## Step 4: Start the Server
1.  Click **Restart** or **Start** in the Node.js dashboard.
2.  Visit your domain. The application should load.

## Troubleshooting
- **White Screen**: Ensure `dist/public` folder exists and contains `index.html`.
- **500 Error**: Check the "stderr.log" or "error.log" in the File Manager.
- **Port**: Hostinger automatically assigns a port. The application reads `process.env.PORT` which is handled correctly.
