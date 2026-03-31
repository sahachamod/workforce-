/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/v1/auth/:path*',
        destination: 'http://localhost:8001/api/v1/auth/:path*',
      },
      {
        source: '/api/v1/users/:path*',
        destination: 'http://localhost:8002/api/v1/users/:path*',
      },
      {
        source: '/api/v1/users',
        destination: 'http://localhost:8002/api/v1/users',
      },
      {
        source: '/api/v1/leaves/:path*',
        destination: 'http://localhost:8003/api/v1/leaves/:path*',
      },
      {
        source: '/api/v1/roster/:path*',
        destination: 'http://localhost:8004/api/v1/roster/:path*',
      },
      {
        source: '/api/v1/projects/:path*',
        destination: 'http://localhost:8005/api/v1/projects/:path*',
      },
      {
        source: '/api/v1/monitoring/:path*',
        destination: 'http://localhost:8006/api/v1/monitoring/:path*',
      },
      {
        source: '/api/v1/analytics/:path*',
        destination: 'http://localhost:8007/api/v1/analytics/:path*',
      },
      {
        source: '/api/v1/notifications/:path*',
        destination: 'http://localhost:8008/api/v1/notifications/:path*',
      },
      {
        source: '/api/v1/payroll/:path*',
        destination: 'http://localhost:8009/api/v1/payroll/:path*',
      },
      {
        source: '/api/v1/payroll',
        destination: 'http://localhost:8009/api/v1/payroll',
      },
    ];
  },
};

module.exports = nextConfig;
