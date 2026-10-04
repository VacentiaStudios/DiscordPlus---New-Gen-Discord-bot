// Starts the production build the same way the Docker image does: the standalone
// server with static assets and public files copied next to it.
import { cpSync, existsSync } from 'node:fs';

const root = '.next/standalone/apps/web';
if (!existsSync(`${root}/server.js`)) {
  console.error('No standalone build found. Run `pnpm build` first.');
  process.exit(1);
}

cpSync('.next/static', `${root}/.next/static`, { recursive: true });
cpSync('public', `${root}/public`, { recursive: true });

await import(new URL(`../${root}/server.js`, import.meta.url).href);
