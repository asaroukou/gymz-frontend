import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  transpilePackages: ['@iziwellpass/ui', '@iziwellpass/api', '@iziwellpass/auth'],

  // Dev CORS workaround: the staging API Gateway only allows *.iziwellpass.com
  // origins (and lambda responses carry no CORS headers at all), so browser
  // calls from localhost are blocked. When API_PROXY_TARGET is set, the app
  // calls same-origin /api/backend/* and the Next server proxies to the real
  // API — no CORS involved. Set NEXT_PUBLIC_API_BASE_URL=/api/backend to use it.
  // The control-plane gateway (onboarding, register-owner, admin, billing
  // webhook) follows the same pattern via CONTROL_PLANE_PROXY_TARGET and
  // /api/control/*.
  async rewrites() {
    const rules = [];
    const target = process.env.API_PROXY_TARGET;
    if (target) {
      rules.push({
        source: '/api/backend/:path*',
        destination: `${target.replace(/\/$/, '')}/:path*`,
      });
    }
    const controlTarget = process.env.CONTROL_PLANE_PROXY_TARGET;
    if (controlTarget) {
      rules.push({
        source: '/api/control/:path*',
        destination: `${controlTarget.replace(/\/$/, '')}/:path*`,
      });
    }
    return rules;
  },
};

export default withNextIntl(nextConfig);
