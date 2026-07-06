import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@iziwellpass/ui', '@iziwellpass/api', '@iziwellpass/auth'],
};

export default nextConfig;
