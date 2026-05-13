import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();
const isProd = process.env.NODE_ENV === 'production';
const base = process.env.DOCS_BASE_PATH ?? (isProd ? '/smart-components' : '');

/** @type {import('next').NextConfig} */
const config = {
  output: 'export',
  reactStrictMode: true,
  basePath: base,
  assetPrefix: base || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: base },
};

export default withMDX(config);
