/**
 * scripts/dev.js
 *
 * Starts the backend (server) and frontend (client) dev servers together so
 * that a single `npm run dev` from the repository root brings up the whole
 * application, as documented in README.md.
 *
 * - Output of both processes is interleaved on this terminal.
 * - Stopping one process (Ctrl+C) stops the other one as well.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';

const targets = [
  { name: 'server', args: ['--prefix', 'server', 'run', 'dev'] },
  { name: 'client', args: ['--prefix', 'client', 'run', 'dev'] },
];

/** @type {import('node:child_process').ChildProcess[]} */
const children = [];
let shuttingDown = false;

function shutdown(exitCode) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
    }
  }
  process.exit(exitCode);
}

for (const target of targets) {
  const child = spawn(npmCommand, target.args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWindows,
    env: process.env,
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.log(`\n[dev] ${target.name} exited (${signal ?? code}). Stopping the other process...`);
    shutdown(code ?? 0);
  });

  child.on('error', (error) => {
    console.error(`[dev] failed to start ${target.name}:`, error.message);
    shutdown(1);
  });

  children.push(child);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('[dev] Starting TokTickIT dev servers...');
console.log('[dev]   frontend -> http://localhost:5173');
console.log('[dev]   backend  -> http://localhost:3000/api/health');
