/** @type {import('next').NextConfig} */
const nextConfig = {
  // In local dev: proxy /api/* to the Express dev server
  // In Vercel production: vercel.json routes handle this instead
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/:path*`,
        },
      ];
    }
    return [];
  },
};
module.exports = nextConfig;
