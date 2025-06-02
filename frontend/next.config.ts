import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@slotwise/types', '@slotwise/utils'],
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    NEXT_PUBLIC_AUTH_SERVICE_URL:
      process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:8001',
    NEXT_PUBLIC_BUSINESS_SERVICE_URL:
      process.env.NEXT_PUBLIC_BUSINESS_SERVICE_URL || 'http://localhost:8003',
    NEXT_PUBLIC_SCHEDULING_SERVICE_URL:
      process.env.NEXT_PUBLIC_SCHEDULING_SERVICE_URL || 'http://localhost:8002',
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
