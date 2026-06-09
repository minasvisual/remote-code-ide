'use strict';
// VSCode sets ELECTRON_RUN_AS_NODE=1 for child processes, which causes Electron
// to behave like plain Node.js (no GUI, no Electron API). This script removes
// that variable before launching electron-vite dev so the app gets proper
// Electron context.
delete process.env.ELECTRON_RUN_AS_NODE;

if (process.argv.includes('--devtools')) {
  process.env.OPEN_DEVTOOLS = '1';
}

const { spawn } = require('child_process');
const path = require('path');

const electronViteCli = path.join(__dirname, '..', 'node_modules', 'electron-vite', 'dist', 'cli.cjs');

const child = spawn(process.execPath, [electronViteCli, 'dev'], {
  stdio: 'inherit',
  env: process.env,
  shell: false
});

child.on('close', (code) => process.exit(code ?? 0));
child.on('error', (err) => { console.error(err); process.exit(1); });
