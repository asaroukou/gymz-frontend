import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['@iziwellpass/ui', '@iziwellpass/api', '@iziwellpass/auth'],

  // Dev CORS workaround: the staging gateways only allow *.iziwellpass.com
  // origins, so the browser calls same-origin /api/control/* and the Next
  // server proxies to the control plane. The admin app never touches the app
  // plane, so there is no /api/backend rule here.
  async rewrites() {
    const controlTarget = process.env.CONTROL_PLANE_PROXY_TARGET;
    if (!controlTarget) {
      return [];
    }
    return [
      {
        source: '/api/control/:path*',
        destination: `${controlTarget.replace(/\/$/, '')}/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
