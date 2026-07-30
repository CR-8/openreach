/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@openreach/ui', '@openreach/types'],
  reactStrictMode: true,
};

module.exports = nextConfig;
