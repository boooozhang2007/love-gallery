/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // 调大限制
    },
  },
  // 如果你是用 API Route (app/api/...), 则不需要这个配置，
  // 但 Next.js 默认 API 解析器限制是 4mb。
};

module.exports = nextConfig;