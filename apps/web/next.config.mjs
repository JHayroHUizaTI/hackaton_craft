import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@crm/shared"],
  outputFileTracingRoot: path.join(import.meta.dirname, "../.."),
  // Genera un output autónomo para Docker (sin node_modules completos en runtime).
  output: "standalone",
};

export default nextConfig;
