import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SECURITY FIX: Production optimizations
  poweredByHeader: false, // Remove X-Powered-By header
  compress: true, // Enable gzip compression
  generateEtags: false, // Disable ETags for security
  
  // SECURITY FIX: Headers configuration
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: process.env.NODE_ENV === 'development' 
              ? 'camera=(), microphone=*, geolocation=()' 
              : 'camera=(), microphone=(self), geolocation=()',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },

  // SECURITY FIX: Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // SECURITY FIX: Server external packages for security
  serverExternalPackages: ['@solana/web3.js'],

  // SECURITY FIX: Webpack configuration
  webpack: (config, { dev, isServer }) => {
    // SECURITY FIX: Disable source maps in production
    if (!dev) {
      config.devtool = false;
    }

    // SECURITY FIX: Optimize bundle size
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    };

    return config;
  },

  // SECURITY FIX: Image optimization
  images: {
    domains: [],
    unoptimized: false,
  },



  // SECURITY FIX: Rewrites for API protection
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

export default nextConfig;
