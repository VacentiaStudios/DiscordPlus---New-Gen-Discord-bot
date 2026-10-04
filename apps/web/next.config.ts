import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { NextConfig } from 'next';

// The monorepo keeps a single .env file at its root.
const repoRoot = path.resolve(process.cwd(), '../..');
loadEnvConfig(repoRoot);

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: repoRoot,
  turbopack: { root: repoRoot },
  transpilePackages: ['@discordplus/db', '@discordplus/shared'],
  poweredByHeader: false,
};

export default nextConfig;
