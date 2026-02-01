#!/usr/bin/env node

/**
 * Deployment script for Stack Attack 2 Pro
 * Deploys the built application to VPS
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Environment configuration
const VPS_HOST = process.env.VPS_HOST || 'your-vps-host.com';
const VPS_USER = process.env.VPS_USER || 'deploy';
const VPS_PATH = process.env.VPS_PATH || '/var/www/stack-attack-2-pro';

function log(message) {
  console.log(`[Deploy] ${message}`);
}

function error(message) {
  console.error(`[Deploy Error] ${message}`);
}

function execute(command, description) {
  log(description);
  try {
    execSync(command, { stdio: 'inherit', cwd: rootDir });
  } catch (err) {
    error(`Failed: ${description}`);
    throw err;
  }
}

async function deploy() {
  log('Starting deployment process...');

  // Verify dist directory exists
  const distPath = join(rootDir, 'dist');
  if (!existsSync(distPath)) {
    error('Build directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Deploy to VPS using rsync
  const rsyncCommand = `rsync -avz --delete ${distPath}/ ${VPS_USER}@${VPS_HOST}:${VPS_PATH}/`;

  try {
    execute(rsyncCommand, 'Deploying to VPS...');
    log('Deployment completed successfully!');
    log(`Application available at: http://${VPS_HOST}`);
  } catch (err) {
    error('Deployment failed.');
    process.exit(1);
  }
}

// Run deployment
deploy().catch((err) => {
  error(err.message);
  process.exit(1);
});
