// Bundles the bot (and the workspace packages it uses) into dist/. Third-party
// packages stay external and are resolved from node_modules at runtime, so each
// of them must be a direct dependency of the bot (pnpm does not hoist).
import { cpSync, readFileSync, rmSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { build } from 'esbuild';

const { dependencies = {} } = JSON.parse(readFileSync('package.json', 'utf8'));
const externals = new Set();

function packageName(importPath) {
  const parts = importPath.split('/');
  return importPath.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

rmSync('dist', { recursive: true, force: true });

await build({
  entryPoints: {
    index: 'src/index.ts',
    'deploy-commands': 'scripts/deploy-commands.ts',
    migrate: '../../packages/db/src/migrate.ts',
  },
  outdir: 'dist',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: true,
  logLevel: 'info',
  plugins: [
    {
      name: 'externalize-dependencies',
      setup(build) {
        build.onResolve({ filter: /^[^./]/ }, (args) => {
          if (args.path.startsWith('@discordplus/')) return undefined;
          if (!isBuiltin(args.path)) externals.add(packageName(args.path));
          return { external: true };
        });
      },
    },
  ],
});

const missing = [...externals].filter((name) => !(name in dependencies));
if (missing.length > 0) {
  console.error(
    `These packages are imported by the bundle but are not dependencies of @discordplus/bot: ${missing.join(', ')}`,
  );
  process.exit(1);
}

// The migrate entry looks for ../drizzle relative to the bundle.
rmSync('drizzle', { recursive: true, force: true });
cpSync('../../packages/db/drizzle', 'drizzle', { recursive: true });
