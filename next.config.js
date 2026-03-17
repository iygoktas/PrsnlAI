/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', 'playwright', 'winston'],
};

module.exports = nextConfig;
