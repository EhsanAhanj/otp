/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  scope: "/app",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = withPWA({
  output: "standalone",
});

module.exports = nextConfig;
