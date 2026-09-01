import type { NextConfig } from "next";
import path from "path";
import withBundleAnalyzer from "@next/bundle-analyzer";

const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Explicitly set the workspace root to silence the warning about multiple lockfiles
  outputFileTracingRoot: path.join(__dirname),
  reactStrictMode: true,
  compress: true,
  // Ensure proper module resolution

  // Top-level configuration for server external packages
  serverExternalPackages: [],
  // Experimental features for React 19 compatibility
  experimental: {
    // React 19 optimizations
    optimizePackageImports: [
      'lucide-react', 
      'framer-motion', 
      'date-fns',

      '@radix-ui/react-icons',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-label',
      '@radix-ui/react-popover',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-separator',
      '@radix-ui/react-slot',
      '@radix-ui/react-tabs',
      '@radix-ui/react-toast',
      '@radix-ui/react-tooltip'
    ],
  },
  // Enable React Compiler (React 19)
  // reactCompiler: true, // Disabled: Requires babel-plugin-react-compiler which failed to install (peer dep conflict)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google Auth
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com', // GitHub Auth
      },
      {
        protocol: 'https',
        hostname: 'i.pravatar.cc', // Placeholders
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Unsplash
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com', // YouTube thumbnails
      }
    ],
    formats: ['image/avif', 'image/webp'],
  },
  // Note: COOP/COEP headers removed to prevent breaking cross-origin image loading (e.g. Google Avatars).
  // Client-side FFmpeg will run in single-threaded mode or compatibility mode.

  // Cache versioning
  generateBuildId: async () => {
    // You can also use `git rev-parse HEAD` here if you want
    return process.env.GIT_HASH || `build-${Date.now()}`;
  },

  // Global headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          // Ensure CDN respects content negotiation
          {
            key: 'Vary', 
            value: 'Accept-Encoding',
          },
        ],
      },
      // API routes specific headers (Backup for when route handlers miss them)
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0', // Default to no-store for API unless overridden by route
          },
        ],
      },
    ];
  },
};


// Injected content via Sentry wizard below

import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(
  bundleAnalyzer(nextConfig),
  {
    // For all available options, see:
    // https://github.com/getsentry/sentry-webpack-plugin#options

    // Suppresses source map uploading logs during build
    silent: true,
    org: "nb-s",
    project: "javascript-nextjs",

    // For all available options, see:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

    // Upload a larger set of source maps for prettier stack traces (increases build time)
    widenClientFileUpload: process.env.CI === "true",

    // Transpiles SDK to be compatible with IE11 (increases bundle size)
    // transpileClientSDK: true,

    // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
    // This can increase your server load as well as your hosting bill.
    // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
    // side errors will fail.
    tunnelRoute: "/monitoring",

    // Hides source maps from generated client bundles
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger statements to reduce bundle size
    disableLogger: true,

    // Enables automatic instrumentation of Vercel Cron Monitors.
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,
  }
);
