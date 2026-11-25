import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
if (Number(process.versions.node.split('.')[0]) < 22) {
  console.error('Please install Node.js 22 or newer (free).'); process.exit(1);
}
function npm(args) {
  const result = process.platform === 'win32'
    ? spawnSync('cmd.exe', ['/d', '/s', '/c', 'npm ' + args.join(' ')], { cwd: root, stdio: 'inherit' })
    : spawnSync('npm', args, { cwd: root, stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
if (!existsSync(new URL('../node_modules/vite/package.json', import.meta.url))) {
  console.log('Installing free project dependencies (internet needed once)...');
  npm(['ci', '--no-audit', '--no-fund']);
}
console.log('Building the showroom...');
npm(['run', 'build']);
const { preview } = await import('vite');
const server = await preview({ root, configFile: false, preview: { host: '127.0.0.1', port: 5173, open: !process.argv.includes('--no-open') } });
server.printUrls();
console.log('Keep this terminal open. Press Ctrl+C to stop the local server.');
