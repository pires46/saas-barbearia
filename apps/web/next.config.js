const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: ["@saas-barbearia/database", "@saas-barbearia/shared"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      react: path.join(__dirname, "../../node_modules/react"),
      "react-dom": path.join(__dirname, "../../node_modules/react-dom"),
    };
    return config;
  },
};
module.exports = nextConfig;
