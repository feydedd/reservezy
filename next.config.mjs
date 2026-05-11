/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Smaller client bundles for tree-shaken motion / icons on the homepage
    optimizePackageImports: ["framer-motion", "lucide-react"],
  },
};

export default nextConfig;
