/** @type {import('next').NextConfig} */
const BACKEND = process.env.BACKEND_INTERNAL_URL || 'http://backend:4002';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '**' },
    ],
  },
  // الواجهة توكّل /api و /uploads للباكند داخلياً → التنل يحتاج قاعدة واحدة فقط (frontend:3020)
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${BACKEND}/api/:path*` },
      { source: '/uploads/:path*', destination: `${BACKEND}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
