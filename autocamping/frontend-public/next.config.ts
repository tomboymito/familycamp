import type { NextConfig } from "next";

const BACKEND = process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
