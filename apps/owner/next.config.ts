import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@iziwellpass/ui', '@iziwellpass/api', '@iziwellpass/auth'],

  // Dev CORS workaround: the staging API Gateway only allows *.iziwellpass.com
  // origins (and lambda responses carry no CORS headers at all), so browser
  // calls from localhost are blocked. When API_PROXY_TARGET is set, the app
  // calls same-origin /api/backend/* and the Next server proxies to the real
  // API — no CORS involved. Set NEXT_PUBLIC_API_BASE_URL=/api/backend to use it.
  async rewrites() {
    const target = process.env.API_PROXY_TARGET;
    if (!target) {
      return [];
    }
    return [
      {
        source: '/api/backend/:path*',
        destination: `${target.replace(/\/$/, '')}/:path*`,
      },
    ];
  },
};

export default nextConfig;
