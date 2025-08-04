import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Add redirects for common cases
  async redirects() {
    return [
      // Redirect common variations to the main page
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/index',
        destination: '/',
        permanent: true,
      },
      {
        source: '/main',
        destination: '/',
        permanent: true,
      },
      // Redirect old or common interview paths
      {
        source: '/interview',
        destination: '/interview-setup',
        permanent: false,
      },
      {
        source: '/interviews',
        destination: '/interview-history',
        permanent: false,
      },
      // Redirect job variations
      {
        source: '/job',
        destination: '/jobs',
        permanent: false,
      },
    ]
  },
  
  // Custom 404 handling
  async rewrites() {
    return {
      // After checking all routes and redirects, any remaining unmatched routes
      // will be handled by the not-found.tsx page
      afterFiles: [],
      beforeFiles: [],
      fallback: [],
    }
  },
};

export default nextConfig;
