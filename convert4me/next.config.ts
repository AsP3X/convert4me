/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable edge runtime for API routes
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'localhost'],
    },
    serverExternalPackages: ['ffmpeg-static', 'sharp'],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
