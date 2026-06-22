/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingExcludes: {
      "/*": ["**/*"],
    },
  },
};

module.exports = nextConfig;
