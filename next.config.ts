import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.EXHIBITION_DIST_DIR || '.next',
  devIndicators: false,

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
