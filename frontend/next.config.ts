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
    const authServiceUrl = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL || 'http://localhost:8001';
    const businessServiceUrl = process.env.NEXT_PUBLIC_BUSINESS_SERVICE_URL || 'http://localhost:8003';
    const schedulingServiceUrl = process.env.NEXT_PUBLIC_SCHEDULING_SERVICE_URL || 'http://localhost:8080';

    return [
      {
        source: '/api/v1/auth/:path*',
        destination: `${authServiceUrl}/api/v1/auth/:path*`,
      },
      {
        source: '/api/v1/businesses/:path*',
        destination: `${businessServiceUrl}/api/v1/businesses/:path*`,
      },
      {
        source: '/api/v1/services/:path*',
        destination: `${businessServiceUrl}/api/v1/services/:path*`,
      },
      {
        source: '/api/v1/bookings/:path*',
        destination: `${schedulingServiceUrl}/api/v1/bookings/:path*`,
      },
      {
        source: '/api/v1/availability/:path*',
        destination: `${schedulingServiceUrl}/api/v1/availability/:path*`,
      },
    ];
  },
};

export default nextConfig;
