import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  turbopack: {},
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default withNextIntl(nextConfig);
