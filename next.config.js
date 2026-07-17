/** @type {import(next).NextConfig} */
const nextConfig = {
  // Local dev: proxy /api/* to the Express dev server (npm run dev:api).
  // On Vercel, vercel.json routes /api/* to the serverless function instead.
  async rewrites() {
    if (process.env.NODE_ENV === "development") {
      return [
        {
          source: "/api/:path*",
          destination: `${process.env.DEV_API_URL || "http://localhost:5000/api"}/:path*`,
        },
      ];
    }
    return [];
  },
  images: { domains: ["lh3.googleusercontent.com"] },
};
module.exports = nextConfig;
