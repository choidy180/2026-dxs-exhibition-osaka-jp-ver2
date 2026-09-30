import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.EXHIBITION_DIST_DIR || '.next',
  devIndicators: false,

  async headers() {
    return [
      '/videos/material-inbound/web-v1/:path*',
      '/videos/takttime/web-v1/:path*',
    ].map(source => ({
      source,
      headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
    }));
  },

  compiler: {
    styledComponents: true,
  },
  
  turbopack: {
    rules: {
      '*.tsx': { loaders: ['./scripts/exhibition-i18n-loader.cjs'] },
    },
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.(tsx|jsx)$/,
      exclude: /node_modules/,
      enforce: 'pre',
      use: ['./scripts/exhibition-i18n-loader.cjs'],
    });
    return config;
  },
};

export default nextConfig;
