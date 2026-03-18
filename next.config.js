/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint errors in pre-existing files don't block the build
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
