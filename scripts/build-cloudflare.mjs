import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const repo = path.resolve(process.env.NISAR_REPO ?? path.join(root, '../skyradar-nisar'));
const python = process.env.PYTHON ?? 'python3';
function run(command, args, env = process.env) {
  // npm is a .cmd shim on Windows and cannot be spawned without a shell.
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit', shell: command === 'npm' && process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Pages serves both the frontend and the API on one origin.
run('npm', ['run', 'build'], { ...process.env, VITE_DATA_MODE: 'api', VITE_API_BASE: '' });
run(python, [path.join(repo, 'water-pulse-be/scripts/export_pages.py'),
  '--out', path.join(root, 'dist'), '--worker-template', path.join(root, 'cloudflare/worker.js')]);
